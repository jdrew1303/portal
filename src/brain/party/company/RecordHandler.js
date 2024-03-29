import {jsonRpcRequest} from 'utilities/network'
import Company from './Company'

const RecordHandler = {
  /**
   * @param {array} [criteria]
   * @param {Query} [query]
   * @constructor
   */
  Collect(criteria, query) {
    return new Promise((resolve, reject) => {
      jsonRpcRequest({
        method: 'CompanyRecordHandler.Collect',
        request: {
          criteria,
          query,
        },
      }).then(result => {
        result.records = result.records.map(company => new Company(company))
        resolve(result)
      }).catch(error => reject(error))
    })
  },
}

export default RecordHandler