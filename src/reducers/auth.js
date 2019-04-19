import {
  setClaims,
  logout, login,
  setMyParty, setMyUser,
} from 'actions/actionTypes'
import {
  LoginClaims,
} from 'brain/security/claims/index'
import {User} from 'brain/user/human/index'

const initState = () => ({
  claims: new LoginClaims(),
  party: {},
  user: new User(),
  loggedIn: false,
  loggedOut: false,
})

export default function auth(state = initState(), action) {
  switch (action.type) {
    case setClaims:
      return {
        ...state,
        claims: action.data,
      }

    case setMyParty:
      return {
        ...state,
        party: action.data,
      }

    case setMyUser:
      return {
        ...state,
        user: action.data,
      }

    case login:
      return {
        ...state,
        loggedIn: true,
        loggedOut: false,
      }

    case logout:
      return {
        ...initState(),
        loggedOut: true,
      }

    default:
      return state
  }
}