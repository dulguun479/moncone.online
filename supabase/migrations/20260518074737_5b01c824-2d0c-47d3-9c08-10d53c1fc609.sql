
REVOKE EXECUTE ON FUNCTION public.generate_payment_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_subscription(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_subscriptions() FROM PUBLIC, anon, authenticated;
