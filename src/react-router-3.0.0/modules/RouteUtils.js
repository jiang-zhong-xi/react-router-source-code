import React from 'react'

function isValidChild(object) {
  return object == null || React.isValidElement(object)
}

export function isReactChildren(object) {
  return isValidChild(object) || (Array.isArray(object) && object.every(isValidChild))
}

function createRoute(defaultProps, props) {
  return { ...defaultProps, ...props }
}

export function createRouteFromReactElement(element) {
  const type = element.type
  const route = createRoute(type.defaultProps, element.props)

  if (route.children) {
    const childRoutes = createRoutesFromReactChildren(route.children, route)

    if (childRoutes.length)
      route.childRoutes = childRoutes

    delete route.children
  }

  return route
}

/**
 * Creates and returns a routes object from the given ReactChildren. JSX
 * provides a convenient way to visualize how routes in the hierarchy are
 * nested.
 *
 *   import { Route, createRoutesFromReactChildren } from 'react-router'
 *
 *   const routes = createRoutesFromReactChildren(
 *     <Route component={App}>
 *       <Route path="home" component={Dashboard}/>
 *       <Route path="news" component={NewsFeed}/>
 *     </Route>
 *   )
 *
 * Note: This method is automatically used when you provide <Route> children
 * to a <Router> component.
 */
export function createRoutesFromReactChildren(children, parentRoute) {
  const routes = []

  React.Children.forEach(children, function (element) {
    if (React.isValidElement(element)) {
      // Component classes may have a static create* method.
      // route类会有createRouteFromReactElement静态方法
      if (element.type.createRouteFromReactElement) {
        const route = element.type.createRouteFromReactElement(element, parentRoute)

        if (route)
          routes.push(route)
      } else {
        routes.push(createRouteFromReactElement(element))
      }
    }
  })

  return routes
}

/**
 * Creates and returns an array of routes from the given object which
 * may be a JSX route, a plain object route, or an array of either.
 * 根据routes生成routes对象
 */
export function createRoutes(routes) {
  if (isReactChildren(routes)) { // 用的router组件生成的虚拟DOM
    routes = createRoutesFromReactChildren(routes)
  } else if (routes && !Array.isArray(routes)) { // 开发者配置的就是路由对象
    routes = [ routes ]
  }

  return routes
}
