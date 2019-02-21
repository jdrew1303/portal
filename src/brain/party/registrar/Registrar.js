import {jsonRpcRequest} from 'utilities/network'
import config from 'react-global-configuration'

export default class Registrar {
  /**
   * @param {Object} partyIdentifier
   * @constructor
   */
  static InviteCompanyAdminUser(partyIdentifier) {
    return jsonRpcRequest({
      url: config.get('brainAPIUrl'),
      method: 'PartyRegistrar.InviteCompanyAdminUser',
      request: {
        partyIdentifier: partyIdentifier.toWrapped(),
      },
    })
  }

  /**
   * @param {User} user
   * @param {string} password
   * @constructor
   */
  static RegisterCompanyAdminUser(user, password) {
    return jsonRpcRequest({
      url: config.get('brainAPIUrl'),
      method: 'PartyRegistrar.RegisterCompanyAdminUser',
      request: {
        user: user.toPOJO(),
        password: password,
      },
    })
  }

  /**
   * @param {Object} partyIdentifier
   * @constructor
   */
  static InviteClientAdminUser(partyIdentifier) {
    return jsonRpcRequest({
      url: config.get('brainAPIUrl'),
      method: 'PartyRegistrar.InviteClientAdminUser',
      request: {
        partyIdentifier: partyIdentifier.toWrapped(),
      },
    })
  }

  /**
   * @param {User} user
   * @param {string} password
   * @constructor
   */
  static RegisterClientAdminUser(user, password) {
    return jsonRpcRequest({
      url: config.get('brainAPIUrl'),
      method: 'PartyRegistrar.RegisterClientAdminUser',
      request: {
        user: user.toPOJO(),
        password: password,
      },
    })
  }
}