import { hot } from 'react-hot-loader';
import React, { Component } from 'react'
import DOM from 'react-dom'
import Autocomplete from '../../lib/index'
import { getStates, matchStateToTerm } from '../../lib/utils'

const STATES = getStates()

class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      value: '',
      isOpen: false,
      forceOpen: false,
    }
  }

  render() {
    const { state } = this
    const open = state.forceOpen || state.isOpen
    return (
      <div>
        <h1>Managed Menu Visibility</h1>
        <h5>Follows pattern List Autocomplete with Automatic Selection of WAI-ARIA 1.1 for combo box</h5>
        <p>
          By default Autocomplete will manage its own menu visibility, using basic logic
          to decide whether or not to display it (e.g. open on focus, keypress, close on blur,
          select, escape, etc). If you need full control over when the menu opens and closes
          you can put Autocomplete into &apos;managed menu visibility mode&apos; by supplying <code>props.open</code>.
          This will force Autocomplete to ignore its internal menu visibility status and always
          hide/show the menu based on <code>props.open</code>. Pair this with <code>props.onMenuVisibilityChange</code>
           - which is invoked each time the internal visibility state changes - for full control
          over the menu&apos;s visibility.
        </p>
        <span id="init-Instructions" className="sr-only">When autocomplete results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures.</span>
        <label htmlFor="states">Choose a US state</label>
        <Autocomplete
          value={state.value}
          suggestionsMenuId="input-name-suggestions"
          selectOnBlur={true}
          autoHighlight={true}
          inputProps={{ id: 'states', autoComplete: "something" ,
          'aria-describedby':"init-Instructions" }}
          items={STATES}
          shouldItemRender={matchStateToTerm}
          getItemValue={item => item.name}
          onSelect={value => this.setState({ value }) }
          onChange={e => this.setState({ value: e.target.value })}
          renderItem={(item, isHighlighted) => (
            <div
              className={`item ${isHighlighted ? 'item-highlighted' : ''}`}
              key={item.abbr}
              aria-selected={isHighlighted}
              role="option"
            >
              {item.name}
            </div>
          )}
          renderMenu={(children, suggestionsMenuId) =>
            <div className="menu" id={suggestionsMenuId} role="listbox">
              {children}
            </div>
          }
          wrapperStyle={{ position: 'relative', display: 'inline-block' }}
          onMenuVisibilityChange={isOpen => this.setState({ isOpen })}
          open={open}
        />
        <button
          onClick={() => this.setState({ isOpen: !state.isOpen })}
          disabled={state.forceOpen}
        >
          {open ? 'Close menu' : 'Open menu'}
        </button>
        <label style={{ display: 'inline-block', marginLeft: 20 }}>
          <input
            type="checkbox"
            checked={state.forceOpen}
            onChange={() => this.setState({ forceOpen: !state.forceOpen })}
          />
          Force menu to stay open
        </label>
      </div>
    )
  }
}

DOM.render(<App/>, document.getElementById('container'))

export default hot(module)(App);