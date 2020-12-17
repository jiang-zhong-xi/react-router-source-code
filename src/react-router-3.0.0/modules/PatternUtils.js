import invariant from 'invariant'

function escapeRegExp(string) {
  // 如果string中有.*+?^${}()|[]\，那么就在前面加个\转义为普通字符
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function _compilePattern(pattern) {
  let regexpSource = ''
  const paramNames = []
  const tokens = [] // 匹配到子串全部存储到tokens中
  /*
    路由路径的几种配置方法
    :paramName – 参数名称用/, ?, or #间隔多个参数
    () – 可选参数或者路径 Wraps a portion of the URL that is optional. You may escape parentheses if you want to use them in a url using a backslash \
    * – 非贪婪模式匹配 Matches all characters (non-greedy) up to the next character in the pattern, or to the end of the URL if there is none, and creates a splat param
    ** - 贪婪模式匹配 Matches all characters (greedy) until the next /, ?, or # and creates a splat param
  */
  let match, lastIndex = 0, matcher = /:([a-zA-Z_$][a-zA-Z0-9_$]*)|\*\*|\*|\(|\)/g
  // matcher的lastIndex属性当正则由全局g时有效，总是记录本次索引到子串的最后一个位置+1，这里总是表示上次索引的最后一个
  while ((match = matcher.exec(pattern))) {
    if (match.index !== lastIndex) {
      // 把pattern分段后存储到tokens中
      tokens.push(pattern.slice(lastIndex, match.index))
      console.log("tokens", tokens)
      // escapeRegExp 特殊字符串中的某些字符加\后可当作元字符去做正则匹配
      regexpSource += escapeRegExp(pattern.slice(lastIndex, match.index))
    }

    if (match[1]) { // 匹配路由路径的参数部分
      regexpSource += '([^/]+)'
      paramNames.push(match[1])
    } else if (match[0] === '**') { // 贪婪模式匹配所有字符
      regexpSource += '(.*)'
      paramNames.push('splat')
    } else if (match[0] === '*') { // 非贪婪模式匹配所有字符
      regexpSource += '(.*?)'
      paramNames.push('splat')
    } else if (match[0] === '(') { // 可选
      regexpSource += '(?:'
    } else if (match[0] === ')') { // 可选
      regexpSource += ')?'
    }

    tokens.push(match[0])

    lastIndex = matcher.lastIndex
  }

  if (lastIndex !== pattern.length) {
    tokens.push(pattern.slice(lastIndex, pattern.length))
    regexpSource += escapeRegExp(pattern.slice(lastIndex, pattern.length))
  }

  return {
    pattern,
    regexpSource,
    paramNames,
    tokens
  }
}

const CompiledPatternsCache = Object.create(null)

export function compilePattern(pattern) {
  if (!CompiledPatternsCache[pattern])
    CompiledPatternsCache[pattern] = _compilePattern(pattern)

  return CompiledPatternsCache[pattern]
}

/**
 * Attempts to match a pattern on the given pathname. Patterns may use
 * the following special characters:
 *
 * - :paramName     Matches a URL segment up to the next /, ?, or #. The
 *                  captured string is considered a "param"
 * - ()             Wraps a segment of the URL that is optional
 * - *              Consumes (non-greedy) all characters up to the next
 *                  character in the pattern, or to the end of the URL if
 *                  there is none
 * - **             Consumes (greedy) all characters up to the next character
 *                  in the pattern, or to the end of the URL if there is none
 *
 *  The function calls callback(error, matched) when finished.
 * The return value is an object with the following properties:
 *
 * - remainingPathname
 * - paramNames
 * - paramValues
 */
export function matchPattern(pattern, pathname) {
  // Ensure pattern starts with leading slash for consistency with pathname.
  if (pattern.charAt(0) !== '/') {
    pattern = `/${pattern}`
  }
  /*
    regexpSource 确定能匹配到路由路径的正则
    paramNames 路由路径中的参数名称

  */
  let { regexpSource, paramNames, tokens } = compilePattern(pattern)

  if (pattern.charAt(pattern.length - 1) !== '/') {
    regexpSource += '/?' // Allow optional path separator at end.
  }

  // Special-case patterns like '*' for catch-all routes.
  // 用$（结束字符）替代特殊字符*
  if (tokens[tokens.length - 1] === '*') {
    regexpSource += '$'
  }

  const match = pathname.match(new RegExp(`^${regexpSource}`, 'i'))
  if (match == null) { // 匹配失败
    return null
  }

  const matchedPath = match[0] // 路由路径和当前地址匹配到的子串
  let remainingPathname = pathname.substr(matchedPath.length) // 去除匹配子串后的路径

  if (remainingPathname) {
    // Require that the match ends at a path separator, if we didn't match
    // the full path, so any remaining pathname is a new path segment.
    if (matchedPath.charAt(matchedPath.length - 1) !== '/') {
      return null
    }

    // If there is a remaining pathname, treat the path separator as part of
    // the remaining pathname for properly continuing the match.
    remainingPathname = `/${remainingPathname}`
  }

  return {
    remainingPathname,
    paramNames,
    paramValues: match.slice(1).map(v => v && decodeURIComponent(v))
  }
}

export function getParamNames(pattern) {
  return compilePattern(pattern).paramNames
}

export function getParams(pattern, pathname) {
  const match = matchPattern(pattern, pathname)
  if (!match) {
    return null
  }

  const { paramNames, paramValues } = match
  const params = {}

  paramNames.forEach((paramName, index) => {
    params[paramName] = paramValues[index]
  })

  return params
}

/**
 * Returns a version of the given pattern with params interpolated. Throws
 * if there is a dynamic segment of the pattern for which there is no param.
 */
export function formatPattern(pattern, params) {
  params = params || {}

  const { tokens } = compilePattern(pattern)
  let parenCount = 0, pathname = '', splatIndex = 0, parenHistory = []

  let token, paramName, paramValue
  for (let i = 0, len = tokens.length; i < len; ++i) {
    token = tokens[i]

    if (token === '*' || token === '**') {
      paramValue = Array.isArray(params.splat) ? params.splat[splatIndex++] : params.splat

      invariant(
        paramValue != null || parenCount > 0,
        'Missing splat #%s for path "%s"',
        splatIndex, pattern
      )

      if (paramValue != null)
        pathname += encodeURI(paramValue)
    } else if (token === '(') {
      parenHistory[parenCount] = ''
      parenCount += 1
    } else if (token === ')') {
      const parenText = parenHistory.pop()
      parenCount -= 1

      if (parenCount)
        parenHistory[parenCount - 1] += parenText
      else
        pathname += parenText
    } else if (token.charAt(0) === ':') {
      paramName = token.substring(1)
      paramValue = params[paramName]

      invariant(
        paramValue != null || parenCount > 0,
        'Missing "%s" parameter for path "%s"',
        paramName, pattern
      )

      if (paramValue == null) {
        if (parenCount) {
          parenHistory[parenCount - 1] = ''

          const curTokenIdx = tokens.indexOf(token)
          const tokensSubset = tokens.slice(curTokenIdx, tokens.length)
          let nextParenIdx = -1

          for (let i = 0; i < tokensSubset.length; i++) {
            if (tokensSubset[i] == ')') {
              nextParenIdx = i
              break
            }
          }

          invariant(
            nextParenIdx > 0,
            'Path "%s" is missing end paren at segment "%s"', pattern, tokensSubset.join('')
          )

          // jump to ending paren
          i = curTokenIdx + nextParenIdx - 1
        }
      }
      else if (parenCount)
        parenHistory[parenCount - 1] += encodeURIComponent(paramValue)
      else
        pathname += encodeURIComponent(paramValue)

    } else {
      if (parenCount)
        parenHistory[parenCount - 1] += token
      else
        pathname += token
    }
  }

  invariant(
    parenCount <= 0,
    'Path "%s" is missing end paren', pattern
  )

  return pathname.replace(/\/+/g, '/')
}
