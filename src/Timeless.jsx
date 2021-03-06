'use strict';
import React from 'react';
import ReactDOM from 'react-dom';

const Timeless = React.createClass({
    getInitialState() {
        return {
            minCursorX: 0,
            maxCursorX: 0,
            minCursorDate: 0,
            maxCursorDate: 0
        }
    },

    getDefaultProps() {
        return {
            dates: {},
            onChange: null,
            onChangeDelay: 250,
            cursorWidth: 75,
            cursorSnap: false,
            timeRangeDrag: false
        }
    },

    componentWillMount() {
        this._getMinMaxDates();
        this._addListeners();
    },

    componentWillUnmount() {
        this._removeListeners();
    },

    componentDidMount() {
        this._setWindowVars();
    },

    render() {
        const minCursorStyle = {
            transform: `translate3d(${this.state.minCursorX}px,0,0)`,
            width: this.props.cursorWidth
        };

        const maxCursorStyle = {
            transform: `translate3d(${this.state.maxCursorX}px,0,0)`,
            width: this.props.cursorWidth
        };

        const timeRangeStyle = {
            transform: `translate3d(${this.state.minCursorX}px,0,0)`,
            width: (this.state.maxCursorX - this.state.minCursorX) + this.props.cursorWidth
        };

        let minCursorClass = 'time-cursor time-cursor--min';
        let maxCursorClass = 'time-cursor time-cursor--max';
        let timeRangeClass = 'timeline-range';

        if (this.state.animate) {
            //minCursorStyle.transition = maxCursorStyle.transition = timeRangeStyle.transition = 'all 0.25s ease';
            minCursorClass += ' timeline-animate';
            maxCursorClass += ' timeline-animate';
            timeRangeClass += ' timeline-animate';
        }

        return (
            <div className="timeline-wrapper" ref={(ref) => this.timelineWrapper = ref}>
                <div className="timeline-available">
                    {this._getAvailableYearsHtml(this.state.minTime, this.state.maxTime)}
                </div>
                <div className={timeRangeClass} style={timeRangeStyle}></div>
                <div className={minCursorClass}
                     ref={(ref) => this.minCursor = ref}
                     style={minCursorStyle}
                     onMouseDown={this._handleMouseDown.bind(this, 'min')}
                     onTouchStart={this._handleMouseDown.bind(this, 'min')}
                    >{this.state.minCursorDate}
                </div>
                <div className={maxCursorClass}
                     ref={(ref) => this.maxCursor = ref}
                     style={maxCursorStyle}
                     onMouseDown={this._handleMouseDown.bind(this, 'max')}
                     onTouchStart={this._handleMouseDown.bind(this, 'max')}
                    >{this.state.maxCursorDate}</div>
            </div>
        );
    },

    _handleDrag(event) {
        let state = {};

        const index = this.state.activeCursor;
        const cursorWidth = this.props.cursorWidth;
        let translateValue = event.clientX - this.state.activeCursorOffsetClient;

        if ( index === 'max' ) {
            if ( translateValue > this.state.wrapperSize - cursorWidth ) translateValue = this.state.wrapperSize - cursorWidth;
            if ( translateValue < this.state.minCursorX + cursorWidth ) translateValue = this.state.minCursorX + cursorWidth;
        }

        if ( index === 'min' ) {
            if ( translateValue < 0 ) translateValue = 0;
            if ( translateValue > this.state.maxCursorX - cursorWidth) translateValue = this.state.maxCursorX - cursorWidth;
        }

        state[`${index}CursorX`] = translateValue;

        this.setState(state, () => {
            this._updateValue();
        });
    },

    _handleChange() {
        if (this.props.onChange !== null && typeof this.props.onChange === 'function') {
            this.props.onChange(this.state)
        }
    },

    _getMinMaxDates() {
        const dates = this.props.dates;
        let minTime;
        let maxTime;

        if(dates) {
            minTime = dates[0].start;
            maxTime = dates[0].start;

            for(let date of dates) {
                if(date.start < minTime) minTime = date.start;
                if(date.start > maxTime) maxTime = date.start;
            }

            minTime = new Date(minTime*1000).getFullYear();
            maxTime = new Date(maxTime*1000).getFullYear();

            this.setState(
                {
                    minTime,
                    maxTime,
                    minCursorDate: minTime,
                    maxCursorDate: minTime
                }
            )
        }
    },

    _getAvailableYearsHtml(min, max) {
        let html = [];

        if ( typeof this.state.timeScale === 'undefined' ) return null;

        const style = {
            width: this.state.timeScale + 'px'
        };

        for(min; min <= max; min++) {
            let className = "time-block--year";

            if (min > this.state.minCursorDate && min < this.state.maxCursorDate) className += " time-block--in-range";
            if (min === this.state.minCursorDate || min === this.state.maxCursorDate) className += " time-block--active";

            html.push(
                (<div className="time-block" style={style} key={`year-${min}`} onClick={this._transitionTo.bind(this, min)} >
                    <span className={className}>{min}</span>
                </div>)
            )
        }

        return html;
    },

    _handleMouseUp()
    {
        window.removeEventListener('mousemove', this._handleDrag, true);
    },

    _handleMouseDown(cursor, event){
        this.setState(
            {
                animate: false,
                activeCursor: cursor,
                activeCursorOffsetClient: event.clientX - this.state[`${cursor}CursorX`]
            }, () => {
                window.addEventListener('mousemove', this._handleDrag, true);
            }
        )
    },

    _handleResize() {
        this._setWindowVars();
    },

    _addListeners() {
        window.addEventListener('mouseup', this._handleMouseUp, false);
        window.addEventListener('resize', this._handleResize, false);
    },

    _removeListeners() {
        window.removeEventListener('mouseup', this._handleMouseUp, false);
        window.removeEventListener('resize', this._handleResize, false);
    },

    _setWindowVars() {
        const time = this.state.maxTime - this.state.minTime;
        const wrapperSize = this.timelineWrapper.offsetWidth;
        const wrapperOffsetLeft = this.timelineWrapper.offsetLeft;

        let {minCursorX, maxCursorX} =  this.state;
        let timeScale = wrapperSize / time;

        if (timeScale < this.props.cursorWidth) {
            timeScale = this.props.cursorWidth;
        }

        if (this.state.timeScale) {
            minCursorX = this._getRepositionCursorX('min', timeScale);
            maxCursorX = this._getRepositionCursorX('max', timeScale);
        } else {
            minCursorX = ( wrapperSize / 4 ) + ( this.props.cursorWidth / 4 );
            maxCursorX = ( wrapperSize / 4 ) * 3 - ( this.props.cursorWidth / 4 );
        }

        this.setState(
            {
                wrapperSize,
                wrapperOffsetLeft,
                timeScale,
                minCursorX,
                maxCursorX
            }, () => {
            this._updateValue();
        });
    },

    _updateValue() {
        const halfCursorWith = this.props.cursorWidth / 2;
        const minCursorDate = this.state.minTime + parseInt((this.state.minCursorX + halfCursorWith) / this.state.timeScale);
        const maxCursorDate = this.state.minTime + parseInt((this.state.maxCursorX + halfCursorWith) / this.state.timeScale);
        const minCursorTimestamp = this._getFirstDayTimestamp(minCursorDate);
        const maxCursorTimestamp = this._getLastDayTimestamp(maxCursorDate);

        this.setState(
            {   minCursorDate,
                maxCursorDate,
                minCursorTimestamp,
                maxCursorTimestamp
            },
            () => {
                this._handleChange()
            }
        );
    },

    _getFirstDayTimestamp(year) {
        const date = new Date(year, 0, 1, 0, 0, 0, 0);
        return date.getTime() / 1000;
    },

    _getLastDayTimestamp(year) {
        const date = new Date(year, 11, 31, 0, 0, 0, 0);
        return date.getTime() / 1000;
    },

    _transitionTo(year, event) {
        const minCursorDiff = Math.abs(year - this.state.minCursorDate);
        const maxCursorDiff = Math.abs(year - this.state.maxCursorDate);
        const activeCursor = minCursorDiff < maxCursorDiff ? 'min' : 'max';
        const clientX = event.clientX - this.state.wrapperOffsetLeft;

        this.setState({
            animate: true,
            activeCursor,
            activeCursorOffsetClient: this.props.cursorWidth / 2
        }, () => {
            this._handleDrag({clientX})
        })
    },

    _getRepositionCursorX(cursor, newTimescale) {
        return (this.state[`${cursor}CursorX`] * newTimescale) / this.state.timeScale;
    }
});

export default Timeless;

