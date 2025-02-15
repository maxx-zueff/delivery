module.exports = {
    apps: [{
      name: "server",
      script: "server.js",
      node_args: "--expose-gc",
      env: {
        NODE_ENV: "production"
      }
    }]
  }
  