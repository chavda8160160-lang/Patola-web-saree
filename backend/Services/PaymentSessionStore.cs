using System.Collections.Concurrent;
using System.Collections.Generic;
using VirasatPatola.Api.DTOs;

namespace VirasatPatola.Api.Services;

public sealed class PaymentSessionStore
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromMinutes(30);
    private readonly ConcurrentDictionary<string, PaymentSession> _sessions = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, IdempotencyRecord> _idempotencyRecords = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, IdempotencyLockEntry> _idempotencyLocks = new(StringComparer.Ordinal);

    public async ValueTask<IdempotencyLockLease> AcquireIdempotencyLockAsync(string key)
    {
        IdempotencyLockEntry entry;
        while (true)
        {
            entry = _idempotencyLocks.GetOrAdd(key, _ => new IdempotencyLockEntry());
            Interlocked.Increment(ref entry.ReferenceCount);
            if (_idempotencyLocks.TryGetValue(key, out var current) && ReferenceEquals(current, entry))
                break;
            Interlocked.Decrement(ref entry.ReferenceCount);
        }

        try
        {
            await entry.Semaphore.WaitAsync();
            return new IdempotencyLockLease(this, key, entry);
        }
        catch
        {
            ReleaseLockReference(key, entry, releaseSemaphore: false);
            throw;
        }
    }

    public bool TryGetIdempotentOrder(string key, out IdempotencyRecord record)
    {
        if (_idempotencyRecords.TryGetValue(key, out record!)
            && DateTimeOffset.UtcNow - record.CreatedAt <= SessionLifetime)
            return true;

        _idempotencyRecords.TryRemove(key, out _);
        record = null!;
        return false;
    }

    public void SaveIdempotentOrder(string key, string requestFingerprint, CreatePaymentOrderResponseDto response)
    {
        _idempotencyRecords[key] = new IdempotencyRecord(requestFingerprint, response, DateTimeOffset.UtcNow);
    }

    public void Add(string orderId, decimal amount, string currency, string orderReference)
    {
        RemoveExpired();
        _sessions[orderId] = new PaymentSession(orderId, amount, currency, orderReference, DateTimeOffset.UtcNow);
    }

    public bool TryGet(string orderId, out PaymentSession session)
    {
        if (_sessions.TryGetValue(orderId, out session!) && DateTimeOffset.UtcNow - session.CreatedAt <= SessionLifetime)
            return true;

        _sessions.TryRemove(orderId, out _);
        session = null!;
        return false;
    }

    public bool MarkVerified(string orderId, string paymentId)
    {
        while (TryGet(orderId, out var session))
        {
            if (session.IsVerified)
                return string.Equals(session.PaymentId, paymentId, StringComparison.Ordinal);
            if (_sessions.TryUpdate(orderId, session with { PaymentId = paymentId, IsVerified = true }, session))
                return true;
        }
        return false;
    }

    public bool TryReserveVerified(string orderId, string paymentId, decimal amount, string currency)
    {
        if (!TryGet(orderId, out var session)
            || !session.IsVerified
            || session.IsReserved
            || !string.Equals(session.PaymentId, paymentId, StringComparison.Ordinal)
            || session.Amount != amount
            || !string.Equals(session.Currency, currency, StringComparison.OrdinalIgnoreCase))
            return false;

        return _sessions.TryUpdate(orderId, session with { IsReserved = true }, session);
    }

    public void ReleaseReservation(string orderId)
    {
        if (TryGet(orderId, out var session) && session.IsReserved)
            _sessions.TryUpdate(orderId, session with { IsReserved = false }, session);
    }

    public void Complete(string orderId)
    {
        _sessions.TryRemove(orderId, out _);
    }

    private void RemoveExpired()
    {
        var cutoff = DateTimeOffset.UtcNow - SessionLifetime;
        foreach (var entry in _sessions)
        {
            if (entry.Value.CreatedAt < cutoff)
                _sessions.TryRemove(entry.Key, out _);
        }
        foreach (var entry in _idempotencyRecords)
        {
            if (entry.Value.CreatedAt < cutoff)
                _idempotencyRecords.TryRemove(entry.Key, out _);
        }
    }

    private void ReleaseLockReference(string key, IdempotencyLockEntry entry, bool releaseSemaphore)
    {
        if (releaseSemaphore)
            entry.Semaphore.Release();

        if (Interlocked.Decrement(ref entry.ReferenceCount) == 0)
            ((ICollection<KeyValuePair<string, IdempotencyLockEntry>>)_idempotencyLocks)
                .Remove(new KeyValuePair<string, IdempotencyLockEntry>(key, entry));
    }

    internal sealed class IdempotencyLockEntry
    {
        public SemaphoreSlim Semaphore { get; } = new(1, 1);
        public int ReferenceCount;
    }

    public sealed class IdempotencyLockLease : IDisposable
    {
        private readonly PaymentSessionStore _owner;
        private readonly string _key;
        private readonly IdempotencyLockEntry _entry;
        private bool _disposed;

        internal IdempotencyLockLease(PaymentSessionStore owner, string key, IdempotencyLockEntry entry)
        {
            _owner = owner;
            _key = key;
            _entry = entry;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            _owner.ReleaseLockReference(_key, _entry, releaseSemaphore: true);
        }
    }

    public sealed record IdempotencyRecord(string RequestFingerprint, CreatePaymentOrderResponseDto Response, DateTimeOffset CreatedAt);
}

public sealed record PaymentSession(
    string OrderId,
    decimal Amount,
    string Currency,
    string OrderReference,
    DateTimeOffset CreatedAt,
    string? PaymentId = null,
    bool IsVerified = false,
    bool IsReserved = false);
