const Resource = require("resources.js");

class UserResource extends Resource {
  toArray() {
    return {
      id: this.id,
      name: this.name,
      phone_number: this.phone_number,
      refresh_token: this.refresh_token,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = UserResource;
