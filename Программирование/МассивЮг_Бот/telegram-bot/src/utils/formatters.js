module.exports = {
  phoneMask: (phone) => phone,
  formatMonetary: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
};
