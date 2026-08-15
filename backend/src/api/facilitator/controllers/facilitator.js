const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::facilitator.facilitator', ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.query.sort) {
      ctx.query.sort = 'lastName:asc,firstName:asc';
    }
    return await super.find(ctx);
  },
}));

