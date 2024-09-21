import React, { useState } from 'react';
import { RRule } from 'rrule';

const RRuleGenerator = () => {

    
    return (
        <div>
            <h3>Generate RRULE String</h3>

            <label>
                Frequency:
                <select value={frequency} onChange={(e) => setFrequency(parseInt(e.target.value))}>
                    <option value={RRule.DAILY}>Daily</option>
                    <option value={RRule.WEEKLY}>Weekly</option>
                    <option value={RRule.MONTHLY}>Monthly</option>
                    <option value={RRule.YEARLY}>Yearly</option>
                </select>
            </label>

            <br />

            <label>
                Interval:
                <input
                    type="number"
                    value={interval}
                    onChange={(e) => setInterval(parseInt(e.target.value))}
                    min="1"
                />
            </label>

            <br />

            <label>
                Count:
                <input
                    type="number"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    min="1"
                />
            </label>

            <br />

            <button onClick={handleGenerateRRule}>Generate RRULE</button>
        </div>
    );
};

export default RRuleGenerator;

