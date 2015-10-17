// Defaults included for demonstration purposes
module.exports = {
  broker: process.env.BROKER || 'amqp://localhost',
  connection: process.env.CONNECTION || 'uber',
  uberToken: process.env.UBER_TOKEN || "BcFMxgIHLmgW-EtL64kD9oK1Ye6so8Iq2ESvBTK2"
}
