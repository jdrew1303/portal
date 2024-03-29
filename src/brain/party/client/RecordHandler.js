import {jsonRpcRequest} from 'utilities/network'
import Client from './Client'
import ReasonsInvalid from 'brain/validate/reasonInvalid/ReasonsInvalid'

const RecordHandler = {
  /**
   * Create a new client
   * @param {Client} client
   * @constructor
   */
  Create(client) {
    return new Promise((resolve, reject) => {
      jsonRpcRequest({
        method: 'ClientRecordHandler.Create',
        request: {
          client,
        },
      }).then(result => {
        resolve(new Client(result.client))
      }).catch(error => reject(error))
    })
  },

  /**
   * Validate a client
   * @param {Client} client
   * @param {string} method
   * @constructor
   */
  Validate(client, method) {
    return new Promise((resolve, reject) => {
      jsonRpcRequest({
        method: 'ClientRecordHandler.Validate',
        request: {
          client,
          method,
        },
      }).then(result => {
        resolve(new ReasonsInvalid(result.reasonsInvalid))
      }).catch(error => reject(error))
    })
  },

  /**
   * @param {array} [criteria]
   * @param {Query} [query]
   * @constructor
   */
  Collect(criteria, query) {
    return new Promise((resolve, reject) => {
      jsonRpcRequest({
        method: 'ClientRecordHandler.Collect',
        request: {
          criteria,
          query,
        },
      }).then(result => {
        result.records = result.records.map(client => new Client(client))
        resolve(result)
      }).catch(error => reject(error))
    })
  },
}
export default RecordHandler