import React from 'react'
import { render } from 'react-dom'
import { Router, Route, browserHistory, IndexRoute, RouterContext } from 'react-router'
import App from './modules/App'
import About from './modules/About'
import Repos from './modules/Repos'
import Repo from './modules/Repo'
import Home from './modules/Home'
function createElement(args) {
  console.log("args", args)
 return <RouterContext {...args} />
}
function All() {
  return <div>兜底组件</div>
}
render((
  <Router history={browserHistory} render={createElement}>
    <Route path="/" component={App}>
      <IndexRoute component={About}/>
      <Route path="/repos" component={Repos}>
        <Route path="/repos/:userName/:repoName" component={Repo}/>
      </Route>
      <Route path="/about" component={About}>
      </Route>
      <Route path="*" component={All}>
      </Route>
    </Route>
  </Router>
), document.getElementById('app'))
