module.exports = ({ env }) => ({
  connection: {
    client: 'mysql',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 3306),
      database: env('DATABASE_NAME', 'planning_db'),
      username: env('DATABASE_USERNAME', 'planning_user'),
      password: env('DATABASE_PASSWORD', 'planning_password'),
      ssl: env.bool('DATABASE_SSL', false),
    },
    options: {
      nullAsDefault: true,
    },
  },
});
