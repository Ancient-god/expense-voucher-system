const Datastore = require('nedb-promises');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const usersDb = Datastore.create({ filename: path.join(dataDir, 'users.db'), autoload: true });
const vouchersDb = Datastore.create({ filename: path.join(dataDir, 'vouchers.db'), autoload: true });

module.exports = {
  usersDb,
  vouchersDb,
};
