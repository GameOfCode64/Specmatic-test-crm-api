import express from "express";

const router = express.Router();

const extractRoutes = (stack, prefix = "") => {
  let routes = [];
  if (!Array.isArray(stack)) return routes;

  stack.forEach((layer) => {
    if (layer.route) {
      const routePath = (prefix + layer.route.path).replace(/\/{2,}/g, "/");
      const methods = Object.keys(layer.route.methods).filter(
        (m) => layer.route.methods[m],
      );
      methods.forEach((method) => {
        routes.push({ method: method.toUpperCase(), path: routePath });
      });
    } else if (
      (layer.name === "router" ||
        layer.name === "bound dispatch" ||
        layer.handle?.stack) &&
      layer.handle?.stack
    ) {
      const rawRegexp = layer.regexp ? layer.regexp.toString() : "";

      const mountPath =
        layer.regexp && layer.regexp.fast_slash
          ? ""
          : rawRegexp
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

router.get("/mappings", (req, res) => {
  const mainRouterStack =
    req.app?._router?.stack || req.app?.router?.stack || req.app?.stack || [];

  const routes = extractRoutes(mainRouterStack).filter(
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
