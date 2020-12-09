/*
  创建路由对象，包括history所有属性、过度管理器的部分属性、router的所有状态

*/
export function createRouterObject(history, transitionManager, state) {
  const router = {
    ...history,
    setRouteLeaveHook: transitionManager.listenBeforeLeavingRoute,
    isActive: transitionManager.isActive
  }

  return assignRouterState(router, state)
}

export function assignRouterState(router, { location, params, routes }) {
  router.location = location
  router.params = params
  router.routes = routes

  return router
}
