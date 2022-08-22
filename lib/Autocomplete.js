const React = require("react");
const memoize = require("lodash.memoize");
const PropTypes = require("prop-types");
const scrollIntoView = require("dom-scroll-into-view");

const IMPERATIVE_API = [
  "blur",
  "checkValidity",
  "click",
  "focus",
  "select",
  "setCustomValidity",
  "setSelectionRange",
  "setRangeText",
];

function getScrollOffset() {
  return {
    x:
      window.pageXOffset !== undefined
        ? window.pageXOffset
        : (
            document.documentElement ||
            document.body.parentNode ||
            document.body
          ).scrollLeft,
    y:
      window.pageYOffset !== undefined
        ? window.pageYOffset
        : (
            document.documentElement ||
            document.body.parentNode ||
            document.body
          ).scrollTop,
  };
}

class Autocomplete extends React.Component {
  static propTypes = {
    /**
     * The items to display in the dropdown menu
     */
    items: PropTypes.array.isRequired,
    /**
     * The value to display in the input field
     */
    value: PropTypes.any,
    /**
     * Arguments: `event: Event, value: String`
     *
     * Invoked every time the user changes the input's value.
     */
    onChange: PropTypes.func,
    /**
     * Arguments: `value: String, item: Any`
     *
     * Invoked when the user selects an item from the dropdown menu.
     */
    onSelect: PropTypes.func,
    /**
     * Arguments: `item: Any, value: String`
     *
     * Invoked for each entry in `items` and its return value is used to
     * determine whether or not it should be displayed in the dropdown menu.
     * By default all items are always rendered.
     */
    shouldItemRender: PropTypes.func,
    /**
     * Arguments: `item: Any`
     *
     * Invoked when attempting to select an item. The return value is used to
     * determine whether the item should be selectable or not.
     * By default all items are selectable.
     */
    isItemSelectable: PropTypes.func,
    /**
     * Arguments: `itemA: Any, itemB: Any, value: String`
     *
     * The function which is used to sort `items` before display.
     */
    sortItems: PropTypes.func,
    /**
     * Arguments: `item: Any`
     *
     * Used to read the display value from each entry in `items`.
     */
    getItemValue: PropTypes.func.isRequired,
    /**
     * Arguments: `item: Any, isHighlighted: Boolean, styles: Object`
     *
     * Invoked for each entry in `items` that also passes `shouldItemRender` to
     * generate the render tree for each item in the dropdown menu. `styles` is
     * an optional set of styles that can be applied to improve the look/feel
     * of the items in the dropdown menu.
     */
    renderItem: PropTypes.func.isRequired,
    /**
     * Arguments: `items: Array<Any>, value: String, styles: Object`
     *
     * Invoked to generate the render tree for the dropdown menu. Ensure the
     * returned tree includes every entry in `items` or else the highlight order
     * and keyboard navigation logic will break. `styles` will contain
     * { top, left, minWidth } which are the coordinates of the top-left corner
     * and the width of the dropdown menu.
     */
    renderMenu: PropTypes.func,
    /**
     * Styles that are applied to the dropdown menu in the default `renderMenu`
     * implementation. If you override `renderMenu` and you want to use
     * `menuStyle` you must manually apply them (`this.props.menuStyle`).
     */
    menuStyle: PropTypes.object,
    /**
     * Arguments: `props: Object`
     *
     * Invoked to generate the input element. The `props` argument is the result
     * of merging `props.inputProps` with a selection of props that are required
     * both for functionality and accessibility. At the very least you need to
     * apply `props.ref` and all `props.on<event>` event handlers. Failing to do
     * this will cause `Autocomplete` to behave unexpectedly.
     */
    renderInput: PropTypes.func,
    /**
     * Props passed to `props.renderInput`. By default these props will be
     * applied to the `<input />` element rendered by `Autocomplete`, unless you
     * have specified a custom value for `props.renderInput`. Any properties
     * supported by `HTMLInputElement` can be specified, apart from the
     * following which are set by `Autocomplete`: value, autoComplete, role,
     * aria-autocomplete. `inputProps` is commonly used for (but not limited to)
     * placeholder, event handlers (onFocus, onBlur, etc.), autoFocus, etc..
     */
    inputProps: PropTypes.object,
    /**
     * Props that are applied to the element which wraps the `<input />` and
     * dropdown menu elements rendered by `Autocomplete`.
     */
    wrapperProps: PropTypes.object,
    /**
     * This is a shorthand for `wrapperProps={{ style: <your styles> }}`.
     * Note that `wrapperStyle` is applied before `wrapperProps`, so the latter
     * will win if it contains a `style` entry.
     */
    wrapperStyle: PropTypes.object,
    /**
     * Whether or not to automatically highlight the top match in the dropdown
     * menu.
     */
    autoHighlight: PropTypes.bool,
    /**
     * Whether or not to automatically select the highlighted item when the
     * `<input>` loses focus.
     */
    selectOnBlur: PropTypes.bool,
    /**
     * Opens the menu on focus even when the input field is empty.
     */
    openOnFocus: PropTypes.bool,
    /**
     * Arguments: `isOpen: Boolean`
     *
     * Invoked every time the dropdown menu's visibility changes (i.e. every
     * time it is displayed/hidden).
     */
    onMenuVisibilityChange: PropTypes.func,
    debug: PropTypes.bool,
    /** Set the id of the menu of suggestions.
     * will be used to link the input with it, so
     * screen readers find it
     */
    suggestionsMenuId: PropTypes.string.isRequired,
    /** String. Label to be used to tell screen
     * reader users how many results are available */
    numberOfResultsAvailableCopy: PropTypes.string,
  };

  static defaultProps = {
    value: "",
    wrapperProps: {},
    wrapperStyle: {
      display: "inline-block",
    },
    inputProps: {},
    renderInput(props) {
      return <input {...props} />;
    },
    onChange() {},
    onSelect() {},
    isItemSelectable() {
      return true;
    },
    renderMenu(items, suggestionsMenuId, value, style) {
      return (
        <div id={suggestionsMenuId} role="listbox" style={{ ...style }}>
          {items}
        </div>
      );
    },
    menuStyle: {
      borderRadius: "3px",
      boxShadow: "0 2px 12px rgba(0, 0, 0, 0.1)",
      background: "rgba(255, 255, 255, 0.9)",
      padding: "2px 0",
      fontSize: "90%",
      position: "fixed",
      overflow: "auto",
      maxHeight: "50%",
    },
    autoHighlight: true,
    selectOnBlur: false,
    openOnFocus: false,
    onMenuVisibilityChange() {},
    numberOfResultsAvailableCopy: "Autocomplete results are available below.",
  };

  constructor(props) {
    super(props);
    this.state = {
      isOpen: false,
      highlightedIndex: null,
      filteredItems: props.items,
    };
    this._debugStates = [];
    this.references = {
      input: React.createRef(),
      menu: {
        current: null,
      },
    };
    this._ignoreBlur = false;
    this._ignoreFocus = false;
    this._scrollOffset = null;
    this._scrollTimer = null;
  }

  getMemoizedFilteredItems = memoize(({ items, value }) =>
    this.getFilteredItemsToMemoize(items, value)
  );

  componentWillUnmount() {
    clearTimeout(this._scrollTimer);
    this._scrollTimer = null;
  }

  UNSAFE_componentWillReceiveProps() {
    if (this.state.highlightedIndex !== null) {
      const highlightedIndex = this.ensureHighlightedIndex();
      this.setState({
        ...highlightedIndex,
      });
    }
  }

  componentDidMount() {
    this.exposeAPI();
  }

  componentDidUpdate(prevProps, prevState) {
    const { isOpen, highlightedIndex } = this.state;

    const { onMenuVisibilityChange, autoHighlight } = this.props;

    this.maybeScrollItemIntoView();

    if (prevState.isOpen !== isOpen) {
      onMenuVisibilityChange(isOpen);
    }

    if (
      autoHighlight &&
      (prevProps.value !== this.props.value || highlightedIndex === null)
    ) {
      this.maybeAutoCompleteText();
    }
  }

  exposeAPI = () => {
    IMPERATIVE_API.forEach((event) => {
      const enventHandler =
        this.references.input.current && this.references.input.current[event];
      if (enventHandler) {
        // this[event] = () => {}
        if (event === "focus") {
          this[event] = this.handleInputFocus;
          return;
        }

        if (event === "blur") {
          this[event] = this.handleInputBlur;
          return;
        }

        this[event] = enventHandler;
      }
      return this[event];
    });
  };

  maybeScrollItemIntoView = () => {
    const { highlightedIndex, isOpen } = this.state;

    const currentItem =
      this.references[`item-${highlightedIndex}`] &&
      this.references[`item-${highlightedIndex}`].current;
    const itemNode = highlightedIndex !== null ? currentItem : null;
    const menuNode = this.references.menu.current;

    if (isOpen && !!itemNode && !!menuNode) {
      scrollIntoView(itemNode, menuNode, {
        onlyScrollIfNeeded: true,
      });
    }
  };

  handleKeyDown = (event) => {
    const { isOpen } = this.state;

    if (this.keyDownHandlers[event.key]) {
      this.keyDownHandlers[event.key].call(this, event);
    } else if (!isOpen) {
      this.setState({
        isOpen: true,
      });
    }
  };

  handleChange = (event) => {
    const { onChange, openOnFocus } = this.props;

    if (!openOnFocus) {
      this.setState({
        isOpen: event.target.value !== "",
      });
    }

    onChange(event, event.target.value);
  };

  keyDownHandlers = {
    ArrowDown(event) {
      event.preventDefault();

      const { isItemSelectable, items, value } = this.props;

      const { highlightedIndex } = this.state;

      // const items = this.getFilteredItems()
      const memoizedItems = this.getMemoizedFilteredItems({ items, value });

      if (!memoizedItems.length) return;

      let index = highlightedIndex === null ? -1 : highlightedIndex;

      for (let i = 0; i < memoizedItems.length; i++) {
        const p = (index + i + 1) % memoizedItems.length;

        if (isItemSelectable(memoizedItems[p])) {
          index = p;
          break;
        }
      }
      if (index > -1 && index !== highlightedIndex) {
        this.setState({
          highlightedIndex: index,
          isOpen: true,
        });
      }
    },

    ArrowUp(event) {
      event.preventDefault();
      const { isItemSelectable, items, value } = this.props;

      const memoizedItems = this.getMemoizedFilteredItems({ items, value });

      if (!memoizedItems.length) return;

      const { highlightedIndex } = this.state;

      let index =
        highlightedIndex === null ? memoizedItems.length : highlightedIndex;

      for (let i = 0; i < memoizedItems.length; i++) {
        const p =
          (index - (1 + i) + memoizedItems.length) % memoizedItems.length;
        if (isItemSelectable(memoizedItems[p])) {
          index = p;
          break;
        }
      }

      if (index !== memoizedItems.length) {
        this.setState({
          highlightedIndex: index,
          isOpen: true,
        });
      }
    },

    Enter(event) {
      const { highlightedIndex, isOpen } = this.state;

      const { getItemValue, onSelect } = this.props;

      // Key code 229 is used for selecting items from character selectors (Pinyin, Kana, etc)
      if (event.keyCode !== 13) return;
      // In case the user is currently hovering over the menu
      this.setIgnoreBlur(false);
      if (!isOpen) {
        // menu is closed so there is no selection to accept -> do nothing
        return;
      } else if (highlightedIndex == null) {
        // input has focus but no menu item is selected + enter is hit -> close the menu, highlight whatever's in input
        this.setState(
          {
            isOpen: false,
          },
          () => {
            this.references.input.current.select();
          }
        );
      } else {
        // text entered + menu item has been highlighted + enter is hit -> update value to that of selected menu item, close the menu
        event.preventDefault();
        const item = this.getFilteredItems()[highlightedIndex];
        const value = getItemValue(item);

        this.setState(
          {
            isOpen: false,
            highlightedIndex: null,
          },
          () => {
            //this.refs.input.focus() // TODO: file issue
            this.references.input.current.setSelectionRange(
              value.length,
              value.length
            );
            onSelect(value, item);
          }
        );
      }
    },

    Escape() {
      // In case the user is currently hovering over the menu
      this.setIgnoreBlur(false);
      this.setState({
        highlightedIndex: null,
        isOpen: false,
      });
    },

    Tab() {
      // In case the user is currently hovering over the menu
      this.setIgnoreBlur(false);
    },
  };

  getFilteredItemsToMemoize = (items, value) => {
    const { shouldItemRender, sortItems } = this.props;

    let filteredItems = items;

    if (shouldItemRender) {
      filteredItems = items.filter((item) => shouldItemRender(item, value));
    }

    if (sortItems) {
      filteredItems.sort((a, b) => sortItems(a, b, value));
    }
    return filteredItems;
  };

  getFilteredItems = () => {
    const { items, shouldItemRender, sortItems, value } = this.props;

    let filteredItems = items;

    if (shouldItemRender) {
      filteredItems = items.filter((item) => shouldItemRender(item, value));
    }

    if (sortItems) {
      filteredItems.sort((a, b) => sortItems(a, b, value));
    }

    return filteredItems;
  };

  maybeAutoCompleteText = () => {
    const { value, getItemValue, isItemSelectable } = this.props;
    const { highlightedIndex } = this.state;

    let newHighlightedIndex = null;

    let index = highlightedIndex === null ? 0 : highlightedIndex;
    let items = this.getFilteredItems();

    for (let i = 0; i < items.length; i++) {
      if (isItemSelectable(items[index])) break;
      index = (index + 1) % items.length;
    }

    const matchedItem =
      items[index] && isItemSelectable(items[index]) ? items[index] : null;

    if (value !== "" && matchedItem) {
      const itemValue = getItemValue(matchedItem);
      const itemValueDoesMatch =
        itemValue.toLowerCase().indexOf(value.toLowerCase()) === 0;

      if (itemValueDoesMatch) {
        newHighlightedIndex = index;
      }
    } else {
      newHighlightedIndex = null;
    }

    if (newHighlightedIndex !== highlightedIndex) {
      this.setState({
        highlightedIndex: newHighlightedIndex,
      });
    }
  };

  ensureHighlightedIndex = () => {
    const { highlightedIndex } = this.state;

    if (highlightedIndex >= this.getFilteredItems().length) {
      return {
        highlightedIndex: null,
      };
    }
  };

  highlightItemFromMouse = (index) => {
    this.setState({
      highlightedIndex: index,
    });
  };

  selectItemFromMouse = (item) => {
    const value = this.props.getItemValue(item);
    // The menu will de-render before a mouseLeave event
    // happens. Clear the flag to release control over focus
    this.setIgnoreBlur(false);
    this.setState(
      {
        isOpen: false,
        highlightedIndex: null,
      },
      () => {
        this.props.onSelect(value, item);
      }
    );
  };

  setIgnoreBlur = (ignore) => {
    this._ignoreBlur = ignore;
  };

  renderItem = (memoizedItems) => {
    const { highlightedIndex } = this.state;

    const { renderItem, isItemSelectable, suggestionsMenuId } = this.props;

    const items = memoizedItems.map((item, index) => {
      const itemRendered = renderItem(item, highlightedIndex === index, {
        cursor: "default",
      });

      const itemIdForRender = `item-${index}`;
      this.references[itemIdForRender] = React.createRef();

      return React.cloneElement(itemRendered, {
        onMouseEnter: isItemSelectable(item)
          ? () => this.highlightItemFromMouse(index)
          : null,
        onClick: isItemSelectable(item)
          ? () => this.selectItemFromMouse(item)
          : null,
        ref: this.references[itemIdForRender],
        key: itemIdForRender,
        id: `${suggestionsMenuId}-${itemIdForRender}`,
      });
    });

    return items;
  };

  renderMenu = (memoizedItems) => {
    const { menuLeft, menuTop, menuWidth } = this.state;

    const { renderMenu, value, suggestionsMenuId, menuStyle } = this.props;

    this.references.menu = React.createRef();

    const items = this.renderItem(memoizedItems);

    const style = {
      left: menuLeft,
      top: menuTop,
      minWidth: menuWidth,
    };
    const menu = renderMenu(items, suggestionsMenuId, value, {
      ...menuStyle,
      ...style,
    });

    return React.cloneElement(menu, {
      ref: this.references.menu,
      // Ignore blur to prevent menu from de-rendering before we can process click
      onTouchStart: () => this.setIgnoreBlur(true),
      onMouseEnter: () => this.setIgnoreBlur(true),
      onMouseLeave: () => this.setIgnoreBlur(false),
    });
  };

  handleInputBlur = (event) => {
    const { highlightedIndex } = this.state;

    const { selectOnBlur, getItemValue, onSelect, inputProps } = this.props;

    if (this._ignoreBlur) {
      this._ignoreFocus = true;
      this._scrollOffset = getScrollOffset();
      this.references.input.current.focus();
      return;
    }
    let setStateCallback;

    if (selectOnBlur && highlightedIndex !== null) {
      const items = this.getFilteredItems();
      const item = items[highlightedIndex];
      const value = getItemValue(item);
      setStateCallback = () => onSelect(value, item);
    }

    this.setState(
      {
        isOpen: false,
        highlightedIndex: null,
      },
      setStateCallback
    );

    const { onBlur } = inputProps;

    if (onBlur) {
      onBlur(event);
    }
  };

  handleInputFocus = (event) => {
    if (this._ignoreFocus) {
      this._ignoreFocus = false;
      const { x, y } = this._scrollOffset;
      this._scrollOffset = null;
      // Focus will cause the browser to scroll the <input> into view.
      // This can cause the mouse coords to change, which in turn
      // could cause a new highlight to happen, cancelling the click
      // event (when selecting with the mouse)
      window.scrollTo(x, y);
      // Some browsers wait until all focus event handlers have been
      // processed before scrolling the <input> into view, so let's
      // scroll again on the next tick to ensure we're back to where
      // the user was before focus was lost. We could do the deferred
      // scroll only, but that causes a jarring split second jump in
      // some browsers that scroll before the focus event handlers
      // are triggered.
      clearTimeout(this._scrollTimer);
      this._scrollTimer = setTimeout(() => {
        this._scrollTimer = null;
        window.scrollTo(x, y);
      }, 0);
      return;
    }

    const { inputProps, openOnFocus } = this.props;

    const { onFocus } = inputProps;

    if (onFocus) {
      if (openOnFocus) {
        this.setState({
          isOpen: true,
        });
      }
      onFocus(event);
    }
  };

  isInputFocused = () => {
    const input = this.references.input.current;
    return input.ownerDocument && input === input.ownerDocument.activeElement;
  };

  handleInputClick = () => {
    const { isOpen } = this.state;

    // Input will not be focused if it's disabled
    if (this.isInputFocused() && isOpen)
      this.setState({
        isOpen: true,
      });
  };

  composeEventHandlers = (internalEvent, externalEvent) => {
    return externalEvent
      ? (event) => {
          internalEvent(event);
          externalEvent(event);
        }
      : internalEvent;
  };

  render() {
    const {
      debug,
      inputProps,
      wrapperStyle,
      wrapperProps,
      renderInput,
      suggestionsMenuId,
      value,
      numberOfResultsAvailableCopy,
      items,
    } = this.props;

    const { highlightedIndex, isOpen } = this.state;

    const memoizedItems = this.getMemoizedFilteredItems({ items, value }) || [];

    if (debug) {
      // you don't like it, you love it
      this._debugStates.push({
        id: this._debugStates.length,
        state: this.state,
      });
    }

    const currentItem = this.references[`item-${highlightedIndex}`];
    const highlightedItemRef = (currentItem && currentItem.current) || null;
    const highlightedItemId = highlightedItemRef
      ? highlightedItemRef.getAttribute("id")
      : "";

    const srOnly = {
      clip: "rect(1px 1px 1px 1px)",
      clip: "rect(1px, 1px, 1px, 1px)", // eslint-disable-line
      position: "absolute",
      padding: "0",
      border: "0",
      height: "1px",
      width: "1px",
      overflow: "hidden",
    };

    const ariaProps = {
      "aria-autocomplete": "list",
      "aria-controls": suggestionsMenuId,
    };

    if (highlightedItemId) {
      ariaProps["aria-activedescendant"] = highlightedItemId;
    }

    return (
      <div style={{ ...wrapperStyle }} {...wrapperProps}>
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-owns={suggestionsMenuId}
          aria-haspopup="listbox"
        >
          {renderInput({
            ...inputProps,
            ...ariaProps,
            ref: this.references.input,
            onFocus: this.handleInputFocus,
            onBlur: this.handleInputBlur,
            onChange: this.handleChange,
            onKeyDown: this.composeEventHandlers(
              this.handleKeyDown,
              inputProps.onKeyDown
            ),
            onClick: this.composeEventHandlers(
              this.handleInputClick,
              inputProps.onClick
            ),
            value: value,
          })}
        </div>
        <span
          style={srOnly}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          aria-relevant="aditions"
        >
          {isOpen &&
            value !== "" &&
            `${memoizedItems.length} ${numberOfResultsAvailableCopy}`}
        </span>
        {isOpen && this.renderMenu(memoizedItems)}
        {debug && (
          <pre style={{ marginLeft: 300 }}>
            {JSON.stringify(
              this._debugStates.slice(
                Math.max(0, this._debugStates.length - 5),
                this._debugStates.length
              ),
              null,
              2
            )}
          </pre>
        )}
      </div>
    );
  }
}

module.exports = Autocomplete;
