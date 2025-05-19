// Filename: migrations/remove-product-collection-unique.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('PRODUCT', 'PRODUCT_collection_id_key');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addConstraint('PRODUCT', {
      fields: ['collection_id'],
      type: 'unique',
      name: 'PRODUCT_collection_id_key'
    });
  }
};