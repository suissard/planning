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
      // Setup permissions dynamically

      const rolesToUpdate = ['authenticated'];
      if (process.env.NODE_ENV === 'development') {
         rolesToUpdate.push('public');
      }

      for (const roleType of rolesToUpdate) {
         const role = await strapi
          .query('plugin::users-permissions.role')
          .findOne({ where: { type: roleType } });

         if (role) {
            const collections = ['activity-template', 'facilitator', 'location', 'participant', 'time-slot'];
            const crudActions = ['find', 'findOne', 'create', 'update', 'delete'];

            let requiredActions = [];
            for (const coll of collections) {
                for (const act of crudActions) {
                     requiredActions.push(`api::${coll}.${coll}.${act}`);
                }
            }

             // Find existing permissions for this role
            const permissions = await strapi
              .query('plugin::users-permissions.permission')
              .findMany({
                where: {
                  role: role.id,
                }
              });

            const existingActions = permissions.map(p => p.action);

            // Create missing permissions
            for (const action of requiredActions) {
              if (!existingActions.includes(action)) {
                await strapi.query('plugin::users-permissions.permission').create({
                  data: {
                    action: action,
                    role: role.id,
                  }
                });
                console.log(`Granted ${action} to ${roleType} role.`);
              }
            }
         }
      }

    } catch (error) {
      console.error('Error in bootstrap setting permissions:', error);
    }
  },
};
