const REGISTERED_ROUTES = [
  { method: "POST", pattern: "/api/v1/auth/login" },
  { method: "GET", pattern: "/api/v1/auth/me" },
  { method: "POST", pattern: "/api/v1/auth/create" },
  { method: "GET", pattern: "/" },
];

export function buildActuatorMappings() {
  const dispatcherServlet = REGISTERED_ROUTES.map(({ method, pattern }) => ({
    details: {
      handlerMethod: {
        className: "ExpressRouteHandler",
        name: `${method} ${pattern}`,
      },
      requestMappingConditions: {
        consumes: [],
        headers: [],
        methods: [method],
        params: [],
        patterns: [pattern],
        produces: [],
      },
    },
  }));

  return {
    contexts: {
      application: {
        mappings: {
          dispatcherServlets: {
            dispatcherServlet,
          },
        },
      },
    },
  };
}
