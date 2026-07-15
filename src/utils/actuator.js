import express from "express";

const router = express.Router();

/**
 * Walks an Express router's internal layer stack and flattens it into
 * { method, path } pairs, resolving nested routers (e.g. /user -> /user/create)
 * into their full mounted path. Keeps this list accurate automatically as
 * routes are added/removed, instead of hand-maintaining a static one.
 */
const extractRoutes = (stack, prefix = "") => {
  let routes = [];

  stack.forEach((layer) => {
    if (layer.route) {
      const routePath = (prefix + layer.route.path).replace(/\/{2,}/g, "/");
      const methods = Object.keys(layer.route.methods).filter(
        (m) => layer.route.methods[m],
      );
      methods.forEach((method) => {
        routes.push({ method: method.toUpperCase(), path: routePath });
      });
    } else if (layer.name === "router" && layer.handle?.stack) {
      const mountPath =
        layer.regexp && layer.regexp.fast_slash
          ? ""
          : layer.regexp
              .toString()
              .replace("/^\\", "")
              .replace("\\/?(?=\\/|$)/i", "")
              .replace(/\\\//g, "/")
              .replace(/[$^]/g, "") || "";

      routes = routes.concat(
        extractRoutes(layer.handle.stack, prefix + mountPath),
      );
    }
  });

  return routes;
};

/**
 * GET /actuator/mappings
 * Mimics the Spring Boot Actuator mappings response shape that Specmatic
 * expects, so it can cross-reference these routes against openapi.yaml
 * and build the API coverage report.
 */
router.get("/mappings", (req, res) => {
  const routes = extractRoutes(req.app._router.stack).filter(
    (r) => r.path && !r.path.includes("undefined"),
  );

  const dispatcherServlet = routes.map(({ method, path }) => ({
    handler: `${method} ${path}`,
    predicate: `{${method} ${path}}`,
    details: {
      handlerMethod: {
        className: "ExpressRoute",
        name: path.replace(/\//g, "_") || "root",
        descriptor: `(${method})`,
      },
      requestMappingConditions: {
        consumes: [],
        headers: [],
        methods: [method],
        params: [],
        patterns: [path],
        produces: [],
      },
    },
  }));

  res.status(200).json({
    contexts: {
      application: {
        mappings: {
          dispatcherServlets: {
            dispatcherServlet: dispatcherServlet,
          },
        },
      },
    },
  });
});

export default router;
