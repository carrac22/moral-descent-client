module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    http: false,
    https: false,
    net: false,
    tls: false,
    fs: false,
    dns: false,
    child_process: false,
    stream: false,
    crypto: false,
    os: false,
    path: false,
    zlib: false,
  };
  return config;
};
