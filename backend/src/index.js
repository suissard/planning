'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }) {
    try {
      // Find the 'authenticated' role
      const authenticatedRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });

      if (authenticatedRole) {
        // Find existing permissions for activity-template for this role
        const permissions = await strapi
          .query('plugin::users-permissions.permission')
          .findMany({
            where: {
              role: authenticatedRole.id,
              action: { $startsWith: 'api::activity-template.activity-template.' }
            }
          });

        const existingActions = permissions.map(p => p.action);
        const requiredActions = [
          'api::activity-template.activity-template.find',
          'api::activity-template.activity-template.findOne',
          'api::activity-template.activity-template.create',
          'api::activity-template.activity-template.update',
          'api::activity-template.activity-template.delete'
        ];

        // Create missing permissions
        for (const action of requiredActions) {
          if (!existingActions.includes(action)) {
            await strapi.query('plugin::users-permissions.permission').create({
              data: {
                action: action,
                role: authenticatedRole.id,
              }
            });
            console.log(`Granted ${action} to authenticated role.`);
          }
        }
      }
    } catch (error) {
      console.error('Error in bootstrap setting permissions:', error);
    }
  },
};
