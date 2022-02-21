function getPagination() {
  const limit = 0;
  const page = 1;

  const skip = (page - 1) * limit;

  return { skip, limit };
}

module.exports = {
  getPagination,
};
