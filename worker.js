export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/login') {
      const response = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
      return response;
    }

    return env.ASSETS.fetch(request);
  },
};
