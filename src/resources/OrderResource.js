const Resource = require("resources.js");

class OrderResource extends Resource {
  toArray() {
    return {
      id: Number(this.id),
      cart_id: this.cart_id,
      address_id: this.address_id,
      order_status_id: this.order_status_id,
      promotion_id: this.promotion_id,
      user_id: this.user_id,
      quantity: this.quantity,
      deliveryfees: this.deliveryfees,
      totalprice: this.totalprice,
      created_at: this.created_at,
      updated_at: this.updated_at,
      cart: this.cart
        ? {
            id: this.cart.id,
            itemId: this.cart.item_id,
            OE_NO: this.cart.OE_NO,
            quantity: this.cart.quantity,
          }
        : null,
      address: this.address
        ? {
            id: this.address.id,
            userId: this.address.user_id,
            buildingNo: this.address.buildingNo,
            floor: this.address.floor,
            isSave: this.address.isSave,
            unit: this.address.unit,
            addressTitle: this.address.addressTitle,
            street: this.address.street,
          }
        : null,
      order_status: this.order_status
        ? {
            id: this.order_status.id,
            status: this.order_status.status,
            userId: this.order_status.userId,
          }
        : null,
      promotion: this.promotion
        ? {
            id: this.promotion.id,
            OE_NO: this.promotion.OE_NO,
            type: this.promotion.type,
          }
        : null,
      user: this.app_user
        ? {
            id: this.app_user.id,
            name: this.app_user.name,
            email: this.app_user.email,
            status: this.app_user.status,
          }
        : null,
    };
  }
}

module.exports = OrderResource;
