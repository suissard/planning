module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET', 'someAdminJwtSecretKeyHereThatShouldBeLongAndSecure'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT', 'someApiTokenSaltKeyHereThatShouldBeLongAndSecure'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT', 'someTransferTokenSaltKeyHereThatShouldBeLongAndSecure'),
    },
  },
});
