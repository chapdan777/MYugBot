class User {
  constructor({ id, role, name, phone, email }) {
    this.id = id;
    this.role = role;
    this.name = name;
    this.phone = phone;
    this.email = email;
  }
}

module.exports = User;
