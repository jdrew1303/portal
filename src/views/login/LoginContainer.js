import React from 'react'
import {connect} from 'react-redux'
import {
  SetClaims,
} from 'actions/auth'
import Login from './Login'

let LoginContainer = props => {
  const {
    SetClaims,
  } = props
  return <Login
      SetClaims={SetClaims}
  />
}

const mapStateToProps = (state) => {
  return {
  }
}

LoginContainer = connect(
    mapStateToProps,
    {
      SetClaims,
    }
)(LoginContainer)

export default LoginContainer