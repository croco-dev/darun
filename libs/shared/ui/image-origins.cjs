const darunImageRemotePatterns = [
  { protocol: 'https', hostname: 'res.cloudinary.com', port: '' },
  { protocol: 'https', hostname: 'via.placeholder.com', port: '' },
];

function isDarunImageRemoteUrl(url) {
  return (
    !url.username &&
    !url.password &&
    darunImageRemotePatterns.some(
      ({ protocol, hostname, port }) =>
        url.protocol === `${protocol}:` && url.hostname === hostname && url.port === port
    )
  );
}

exports.darunImageRemotePatterns = darunImageRemotePatterns;
exports.isDarunImageRemoteUrl = isDarunImageRemoteUrl;
