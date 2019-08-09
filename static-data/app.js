import { hot } from 'react-hot-loader';
import React from 'react'
import DOM from 'react-dom'
import { getStates, matchStateToTerm, sortStates } from '../../lib/utils'
import Autocomplete from '../../lib/index'

class App extends React.Component {
  state = { value: 'Ma' }
  render() {
    return (
      <div>
        <h1>Basic Example with Static Data</h1>
        <h5>Follows pattern: List Autocomplete without Manual Selection approach for combobox WAI-ARIA 1.1</h5>
        <p>
          When using static data, you use the client to sort and filter the items,
          so <code>Autocomplete</code> has methods baked in to help.
        </p>
        <span id="init-Instructions" className="sr-only">When autocomplete results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures.</span>
        <label htmlFor="states-autocomplete">Choose a state from the US</label>
        <Autocomplete
          value={this.state.value}
          selectOnBlur={false}
          autoHighlight={false}
          inputProps={{
            id: 'states-autocomplete',
            name: 'input-name',
            autoComplete: "something" ,
            'aria-describedby':"init-Instructions"
           }}
          suggestionsMenuId="input-name-suggestions"
          wrapperStyle={{ position: 'relative', display: 'inline-block' }}
          items={getStates()}
          getItemValue={(item) => item.name}
          shouldItemRender={matchStateToTerm}
          sortItems={sortStates}
          onChange={(event, value) => this.setState({ value })}
          onSelect={value => this.setState({ value })}
          renderMenu={(children, suggestionsMenuId) => (
            <div className="menu" id={suggestionsMenuId} role="listbox">
              {children}
            </div>
          )}
          renderItem={(item, isHighlighted) => (
            <div
              className={`item ${isHighlighted ? 'item-highlighted' : ''}`}
              key={item.abbr}
              aria-selected={isHighlighted}
              role="option"
            >{item.name}</div>
          )}
        />
      </div>
    )
  }
}

DOM.render(<App/>, document.getElementById('container'))

export default hot(module)(App);