/*
 * @Description: 
 * @Author: GuoX
 * @Date: 2020-12-01 15:46:08
 * @LastEditTime: 2020-12-03 17:22:05
 * @LastEditors: GuoX
 */
import Greact from './react-core/react';
// import Didact from './'
// import React from 'react'
import ReactDOM from 'react-dom';


// const element1 = <h1>hello</h1>

// console.log(element1)
// const element = React.createElement('h1', { title: 'foo' }, 'Hello')
// console.log(element)


/*
** 原生方法实现dom元素的生成
const element = {
  type: 'h1',
  props: {
    title: 'foo',
    children: 'Hello',
  }
}

const container = document.getElementById('root');

const node = document.createElement(element.type);

node['title'] = element.props.title;

const text = document.createTextNode("");

text['nodeValue'] = element.props.children;

node.appendChild(text);

container.appendChild(node)
*/


/** @jsx Greact.createElement */
function Counter() {
  const [state, setState] = Greact.useState(1)
  return (
    <h1 onClick={() => setState(c => c + 1)}>
      Count: {state}
    </h1>
  )
}
const element = <Counter />



console.log(element)

Greact.render(
  element,
  document.getElementById('root')
);
