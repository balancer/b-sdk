const dotenv = require('dotenv');

dotenv.config();

module.exports = {
    schema: process.env.BACKEND_URL,
    documents: './src/**/*.{graphql,js,ts,jsx,tsx}',
};
