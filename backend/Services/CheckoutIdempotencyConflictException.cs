namespace VirasatPatola.Api.Services;

public sealed class CheckoutIdempotencyConflictException : Exception
{
    public CheckoutIdempotencyConflictException()
        : base("This checkout key was already used with different order details.")
    {
    }
}
