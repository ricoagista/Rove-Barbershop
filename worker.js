export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      url.pathname = '/login';
      return Response.redirect(url.toString(), 302);
    }

    return env.ASSETS.fetch(request);
  },
};
