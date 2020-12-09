import invariant from 'invariant'
import React from 'react'

import createTransitionManager from './createTransitionManager'
import { routes } from './InternalPropTypes'
import RouterContext from './RouterContext'
import { createRoutes } from './RouteUtils'
import { createRouterObject, assignRouterState } from './RouterUtils'
import warning from './routerWarning'

const { func, object } = React.PropTypes
console.log("func", func)

/**
 * A <Router> is a high-level API for automatically setting up
 * a router that renders a <RouterContext> with all the props
 * it needs each time the URL changes.
 */
const Router = React.createClass({

  propTypes: {
    history: object, // 路由模式
    children: routes, // 子路由
    routes, // alias for children 子路由
    render: func, // 根据router对象创建当前组件树
    createElement: func, // 当前页面对应的组件都会以参数形式传入此函数，可以用来做props拦截
    onError: func, // 路由获取 错误时调用
    onUpdate: func, // 路由 更新时调用

    // PRIVATE: For client-side rehydration of server match.
    matchContext: object
  },

  getDefaultProps() {
    return {
      render(props) {
        return <RouterContext {...props} />
      }
    }
  },

  getInitialState() {
    return {
      location: null,
      routes: null,
      params: null,
      components: null
    }
  },

  handleError(error) {
    if (this.props.onError) {
      this.props.onError.call(this, error)
    } else {
      // Throw errors by default so we don't silently swallow them!
      throw error // This error probably occurred in getChildRoutes or getComponents.
    }
  },

  createRouterObject(state) {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext.router
    }

    const { history } = this.props
    return createRouterObject(history, this.transitionManager, state)
  },

  createTransitionManager() {
    const { matchContext } = this.props
    if (matchContext) {
      return matchContext.transitionManager
    }

    const { history } = this.props
    const { routes, children } = this.props

    invariant(
      history.getCurrentLocation,
      'You have provided a history object created with history v2.x or ' +
      'earlier. This version of React Router is only compatible with v3 ' +
      'history objects. Please upgrade to history v3.x.'
    )

    return createTransitionManager(
      history,
      createRoutes(routes || children)
    )
  },

  componentWillMount() {
    debugger
    this.transitionManager = this.createTransitionManager() // 监听变化-组件更新的核心逻辑
    this.router = this.createRouterObject(this.state)
    // 监听路由变化，更新完后调用回调函数
    this._unlisten = this.transitionManager.listen((error, state) => {
      if (error) {
        this.handleError(error)
      } else {
        // Keep the identity of this.router because of a caveat in ContextUtils:
        // they only work if the object identity is preserved.
        assignRouterState(this.router, state)
        this.setState(state, this.props.onUpdate)
      }
    })
  },

  /* istanbul ignore next: sanity check */
  componentWillReceiveProps(nextProps) {
    warning(
      nextProps.history === this.props.history,
      'You cannot change <Router history>; it will be ignored'
    )

    warning(
      (nextProps.routes || nextProps.children) ===
        (this.props.routes || this.props.children),
      'You cannot change <Router routes>; it will be ignored'
    )
  },

  componentWillUnmount() {
    if (this._unlisten)
      this._unlisten()
  },

  render() {
    const { location, routes, params, components } = this.state
    const { createElement, render, ...props } = this.props
    console.log('render', render)
    if (location == null)
      return null // Async match

    // Only forward non-Router-specific props to routing context, as those are
    // the only ones that might be custom routing context props.
    Object.keys(Router.propTypes).forEach(propType => delete props[propType])

    return render({
      ...props,
      router: this.router,
      location,
      routes,
      params,
      components,
      createElement
    })
  }

})
console.log("Router", Router)
export default Router
