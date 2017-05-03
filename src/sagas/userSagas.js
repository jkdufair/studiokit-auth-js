import { call, put, takeEvery } from 'redux-saga/effects'
import actions, { createAction } from '../actions'
import { userService } from '../services'

function* getUserInfo() {
	const userInfo = yield call(userService.getInfo)
	yield put(createAction(actions.STORE_USER_INFO, userInfo))
}

export function* user() {
	yield takeEvery(actions.LOGIN_SUCCESS, getUserInfo)
}