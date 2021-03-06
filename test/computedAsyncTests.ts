import * as test from "blue-tape";
import delay from "./delay";

import { observable, autorun, useStrict, runInAction } from "mobx"
import { computedAsync } from "../computedAsync"

async function nonReverting(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ x: 0, y: 0 });

    const r = computedAsync(500, async () => {
        const vx = o.x, vy = o.y;
        await delay(100);
        return vx + vy;
    }, 1);

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting);
                resolve();
            };
        });
    }

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

    assert.equal(busyChanges, 1);

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    assert.equal(busyChanges, 2);

    runInAction(() => o.x = 2);

    assert.equal(busyChanges, 2);

    await expected(2);

    assert.equal(busyChanges, 3);

    runInAction(() => o.y = 3);

    assert.equal(busyChanges, 3);

    await delay(10);

    assert.equal(busyChanges, 4);

    await expected(5);

    assert.equal(busyChanges, 5);
    
    runInAction(() => o.x = 4);

    assert.equal(busyChanges, 5);

    await expected(7);

    stopRunner();

    runInAction(() => o.y = 4);

    assert.equal(busyChanges, 7);

    assert.equal(r.value, 7);

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    runInAction(() => o.x = 5);
    await delay(1000);

    assert.equal(busyChanges, 7);

    expect = v => assert.equal(v, 7); 

    stopRunner = autorun(() => expect(r.value));

    runInAction(() => o.x = 1);

    assert.equal(busyChanges, 7);
    
    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    assert.equal(busyChanges, 9);

    runInAction(() => o.x = 2);

    assert.equal(busyChanges, 9);

    await delay(1000);
    
    assert.equal(busyChanges, 9);

    stopRunner();
    stopCountBusyChanges();
}

test(`non-reverting, useStrict(true)`, assert => nonReverting(true, assert));
test(`non-reverting, useStrict(false)`, assert => nonReverting(false, assert));

async function synchronous(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ x: 0, y: 0 });

    const r = computedAsync(500, async () => {
        const vx = o.x, vy = o.y;
        await delay(100);            
        return vx + vy;
    });

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting);
                resolve();
            };
        });
    }

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

    assert.equal(busyChanges, 1);

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    assert.equal(busyChanges, 2);

    runInAction(() => o.x = 2);

    assert.equal(busyChanges, 2);

    await expected(2);

    assert.equal(busyChanges, 3);

    runInAction(() => o.y = 3);

    assert.equal(busyChanges, 4);

    await delay(10);

    assert.equal(busyChanges, 4);

    await expected(5);

    assert.equal(busyChanges, 5);
    
    runInAction(() => o.x = 4);

    assert.equal(busyChanges, 6);

    await expected(7);

    stopRunner();

    runInAction(() => o.y = 4);

    assert.equal(busyChanges, 7);

    assert.equal(r.value, 7);

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    runInAction(() => o.x = 5);
    await delay(1000);

    assert.equal(busyChanges, 9);

    expect = v => assert.equal(v, 8); 

    stopRunner = autorun(() => expect(r.value));

    runInAction(() => o.x = 1);

    assert.equal(busyChanges, 10);
    
    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    assert.equal(busyChanges, 11);

    runInAction(() => o.x = 2);

    assert.equal(busyChanges, 11);

    await delay(1000);
    
    assert.equal(busyChanges, 11);

    stopRunner();
    stopCountBusyChanges();
}

test(`synchronous, useStrict(true)`, assert => synchronous(true, assert));
test(`synchronous, useStrict(false)`, assert => synchronous(false, assert));

function fullSynchronous(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ x: 0, y: 0 });

    const r = computedAsync<number>(500, () => {            
        return o.x + o.y;
    });

    assert.equal(r.value, 0);

    runInAction(() => o.x = 2);

    assert.equal(r.value, 2);

    runInAction(() => o.y = 3);

    assert.equal(r.value, 5);

    return Promise.resolve();
}

test("full synchronous, useStrict(true)", (assert) => fullSynchronous(true, assert));
test("full synchronous, useStrict(false)", (assert) => fullSynchronous(false, assert));

async function reverting(strictness: boolean, assert: test.Test) {
    useStrict(strictness);
    
    const o = observable({ x: 0, y: 0 });

    const r = computedAsync({
        init: 500,
        fetch: async () => {
            const vx = o.x, vy = o.y;
            await delay(100);
            return vx + vy;
        },
        revert: true,
        delay: 1
    });

    let expect = (v: number) => assert.equal(v, 500);

    function expected(expecting: number) {
        return new Promise<void>(resolve => {
            expect = got => {
                assert.equal(got, expecting);
                resolve();
            };
        });
    }

    let stopRunner = autorun(() => expect(r.value));

    await delay(10);

    runInAction(() => o.x = 2);

    await expected(500);
    await expected(2);

    runInAction(() => o.y = 3);

    await expected(500);
    await expected(5);

    runInAction(() => o.x = 4);

    await expected(500);
    await expected(7);

    stopRunner();

    runInAction(() => o.y = 4);

    assert.equal(r.value, 7);

    expect = v => {
        assert.fail(`unexpected[1]: ${v}`);
    };

    runInAction(() => o.x = 5);
    await delay(1000);

    expect = v => assert.equal(v, 7); 

    stopRunner = autorun(() => expect(r.value));

    runInAction(() => o.x = 1);
    
    await expected(500);
    await expected(5);

    stopRunner();

    expect = v => assert.fail(`unexpected[2]: ${v}`);

    runInAction(() => o.x = 2);

    await delay(1000);
    
    stopRunner();
}

test("reverting, useStrict(true)", async (assert) => reverting(true, assert));
test("reverting, useStrict(false)", async (assert) => reverting(false, assert));

async function errorHandling(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ b: true });

    const r = computedAsync(123, 
        () => o.b 
            ? Promise.reject("err") 
            : Promise.resolve(456), 1);

    assert.equal(r.value, 123);

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

    let valueChanges = 0;
    const stopCountValueChanges = autorun(() => {
        r.value;
        valueChanges++;
    });

    let errorChanges = 0;
    const stopCountErrorChanges = autorun(() => {
        r.error;
        errorChanges++;
    });

    assert.equal(busyChanges, 1);
    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 1, "errorChanges");
    assert.equal(r.value, 123);

    await delay(10);

    assert.equal(busyChanges, 3);
    assert.equal(valueChanges, 2);
    assert.equal(errorChanges, 2);
    assert.equal(r.value, 123);
    assert.equal(r.error, "err");

    runInAction(() => o.b = false);

    await delay(10);

    assert.equal(busyChanges, 5);
    assert.equal(valueChanges, 3);
    assert.equal(errorChanges, 3);
    assert.equal(r.value, 456);
    assert.equal(r.error, undefined);

    runInAction(() => o.b = true);

    await delay(10);

    assert.equal(busyChanges, 7);
    assert.equal(valueChanges, 4);
    assert.equal(errorChanges, 4);
    assert.equal(r.value, 123);
    assert.equal(r.error, "err");

    stopCountErrorChanges();
    stopCountValueChanges();
    stopCountBusyChanges();
}

test(`error handling - default, useStrict(true)`, assert => errorHandling(true, assert));
test(`error handling - default, useStrict(false)`, assert => errorHandling(false, assert));

async function errorHandlingReplace(strictness: boolean, assert: test.Test) {
    useStrict(strictness);

    const o = observable({ b: true });

    const r = computedAsync({
        init: "123", 
        fetch: () => o.b 
            ? Promise.reject("bad") 
            : Promise.resolve("456"),
        error: e => "error: " + e,
        delay: 1
    });

    assert.equal(r.value, "123");

    let busyChanges = 0;
    const stopCountBusyChanges = autorun(() => {
        r.busy;
        busyChanges++;
    });

    let valueChanges = 0;
    const stopCountValueChanges = autorun(() => {
        r.value;
        valueChanges++;
    });

    let errorChanges = 0;
    const stopCountErrorChanges = autorun(() => {
        r.error;
        errorChanges++;
    });

    assert.equal(busyChanges, 1);
    assert.equal(valueChanges, 1);
    assert.equal(errorChanges, 1);
    assert.equal(r.value, "123");

    await delay(10);

    assert.equal(busyChanges, 3);
    assert.equal(valueChanges, 2);
    assert.equal(errorChanges, 2);
    assert.equal(r.value, "error: bad");
    assert.equal(r.error, "bad");

    runInAction(() => o.b = false);

    await delay(10);

    assert.equal(busyChanges, 5);
    assert.equal(valueChanges, 3);
    assert.equal(errorChanges, 3);
    assert.equal(r.value, "456");
    assert.equal(r.error, undefined);

    runInAction(() => o.b = true);

    await delay(10);

    assert.equal(busyChanges, 7);
    assert.equal(valueChanges, 4);
    assert.equal(errorChanges, 4);
    assert.equal(r.value, "error: bad");
    assert.equal(r.error, "bad");

    stopCountErrorChanges();
    stopCountValueChanges();
    stopCountBusyChanges();
}

test(`error handling - replace, useStrict(true)`, assert => errorHandlingReplace(true, assert));
test(`error handling - replace, useStrict(false)`, assert => errorHandlingReplace(false, assert));
