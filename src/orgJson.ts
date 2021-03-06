import { 
  JSONValue,
  JSONValueKind,
  log,
  TypedMap
} from "@graphprotocol/graph-ts"
  
import { getJson } from "./ipfs"
import {
  LegalEntity,
  OrganizationalUnit,
  OrganizationAddress,
  PublicKey,
  Service,
} from "../generated/schema"

// Structure to provide the parsed data
export class OrgJson {
  did: string
  organizationalType: string
  legalEntity: LegalEntity
  organizationalUnit: OrganizationalUnit
  publicKey: PublicKey[]
  service: Service[]
}

// Get safely a property of an object
function safeGet(jsonObject: TypedMap<string, JSONValue> | null, expectedKind: JSONValueKind, property: string): JSONValue | null {
  if(jsonObject == null) {
    return null
  }
  
  // Check presence
  if(!jsonObject.isSet(property)) {
    log.error('OrgJSON|{}|Missing property', [property])
    return null
  }

  // Get the property value
  let value = jsonObject.get(property)
  if(value.kind != expectedKind) {
    log.error('OrgJSON|{}|Unexpected kind', [property])
    return null
  }

  return value
}

// Get a propeperty as string
function getStringProperty(jsonObject: TypedMap<string, JSONValue> | null, property: string): string | null {
  let value = safeGet(jsonObject, JSONValueKind.STRING, property)
  return value != null ? value.toString() : null
}

// Get a propeperty as object
function getObjectProperty(jsonObject: TypedMap<string, JSONValue> | null, property: string): TypedMap<string, JSONValue> | null {
  let value = safeGet(jsonObject, JSONValueKind.OBJECT, property)
  return value != null ? value.toObject() : null
}

// Get a propperty as array
function getArrayProperty(jsonObject: TypedMap<string, JSONValue> | null, property: string): Array<JSONValue> | null {
  let value = safeGet(jsonObject, JSONValueKind.ARRAY, property)
  return value != null ? value.toArray() : null
}

// Convert a JSON Value to an Address
function toAddress(did: string, jsonObject: TypedMap<string, JSONValue> | null): OrganizationAddress | null {
  if(jsonObject == null) {
    return null
  }
  
  let outputAddress = OrganizationAddress.load(did)
  if(!outputAddress) {
    outputAddress = new OrganizationAddress(did)
  }

  outputAddress.country = getStringProperty(jsonObject, 'country')
  outputAddress.subdivision = getStringProperty(jsonObject, 'subdivision')
  outputAddress.locality = getStringProperty(jsonObject, 'locality')
  outputAddress.streetAddress = getStringProperty(jsonObject, 'streetAddress')
  outputAddress.postalCode = getStringProperty(jsonObject, 'postalCode')

  return outputAddress

}

// Convert a JSON Value to a Public Key
function toPublicKey(did: string, jsonObject: TypedMap<string, JSONValue> | null): PublicKey | null {
  if(jsonObject == null) {
    return null
  }

  let id = getStringProperty(jsonObject, 'id')
  let pem = getStringProperty(jsonObject, 'publicKeyPem')
  let type = getStringProperty(jsonObject, 'type')

  if((id == null) || (pem == null) || (type == null)) {
    log.error('OrgJSON|{}|Missing mandatory Public Key properties', [did])
  }
  
  let outputPublicKey = PublicKey.load(id)
  if(!outputPublicKey) {
    outputPublicKey = new PublicKey(id)
  }

  outputPublicKey.type = type
  outputPublicKey.publicKeyPem = pem
  outputPublicKey.controller = getStringProperty(jsonObject, 'controller')
  outputPublicKey.note = getStringProperty(jsonObject, 'note')

  return outputPublicKey

}

// Convert a JSON Object to a Service
function toService(did: string, jsonObject: TypedMap<string, JSONValue> | null): Service | null {
  if(jsonObject == null) {
    return null
  }

  let id = getStringProperty(jsonObject, 'id')
  let serviceEndpoint = getStringProperty(jsonObject, 'serviceEndpoint')

  if((id == null) || (serviceEndpoint == null)) {
    log.error('OrgJSON|{}|Missing mandatory Service properties', [did])
  }
  
  let outputService = Service.load(id)
  if(!outputService) {
    outputService = new Service(id)
  }

  outputService.serviceEndpoint = serviceEndpoint
  outputService.type = getStringProperty(jsonObject, 'type')
  outputService.version = getStringProperty(jsonObject, 'version')
  outputService.description = getStringProperty(jsonObject, 'description')
  outputService.docs = getStringProperty(jsonObject, 'docs')

  return outputService

}


// Convert a JSON Value to legal entity
function toLegalEntity(did: string, jsonObject: TypedMap<string, JSONValue> | null): LegalEntity | null {

  if(jsonObject == null) {
    return null
  }

  let outputLegalEntity = LegalEntity.load(did)
  if(!outputLegalEntity) {
    outputLegalEntity = new LegalEntity(did)
  }
  
  // Handle legal name presence
  outputLegalEntity.legalName = getStringProperty(jsonObject, 'legalName')
  outputLegalEntity.legalType = getStringProperty(jsonObject, 'legalType')
  outputLegalEntity.legalIdentifier = getStringProperty(jsonObject, 'legalIdentifier')
  
  // Handle the address
  let addressObject = getObjectProperty(jsonObject, 'registeredAddress')
  if(addressObject) {
    let address = toAddress(did, addressObject)
    if(address) {
      address.save()
      outputLegalEntity.registeredAddress = address.id
    }
  }

  return outputLegalEntity
}

// Convert a JSON Value to an organizational unit
function toOrganizationalUnit(did: string, jsonObject: TypedMap<string, JSONValue> | null): OrganizationalUnit | null {
      
  if(jsonObject == null) {
    return null
  }

  let outputOrganizationalUnit = OrganizationalUnit.load(did)
  if(!outputOrganizationalUnit) {
    outputOrganizationalUnit = new OrganizationalUnit(did)
  }
  
  // Handle legal name presence
  outputOrganizationalUnit.name = getStringProperty(jsonObject, 'name')
  let types = getArrayProperty(jsonObject, 'type')
  if(types != null) {
    outputOrganizationalUnit.type = (types as Array<JSONValue>).map<string>((value: JSONValue) => value.toString())
  }
  outputOrganizationalUnit.description = getStringProperty(jsonObject, 'description')
  outputOrganizationalUnit.longDescription = getStringProperty(jsonObject, 'longDescription')

  // Handle the address
  let addressObject = getObjectProperty(jsonObject, 'address')
  if(addressObject) {
    let address = toAddress(did, addressObject)
    if(address) {
      address.save()
      outputOrganizationalUnit.address = address.id
    }
  }

  return outputOrganizationalUnit
}

// Resolve an Organization
export function resolve(orgid: string, ipfsCid: string): OrgJson | null {

  // Extract JSON document
  let orgJsonValue = getJson(ipfsCid, JSONValueKind.OBJECT)
  if(!orgJsonValue) {
    log.warning('OrgJson|{}|Error fetching JSON', [ipfsCid])
    return null
  }
  let orgJsonObject = orgJsonValue.toObject()
  let orgJson = new OrgJson()

  // Process DID
  orgJson.did = getStringProperty(orgJsonObject, 'id')
  if(!orgJson.did) {
    log.error('orgJson|{}|Missing did', [])
    return null
  }

  // Process Legal Entity
  let legalEntityObject = getObjectProperty(orgJsonObject, 'legalEntity')
  if(legalEntityObject) {
    orgJson.organizationalType = 'LegalEntity'
    let legalEntity = toLegalEntity(orgJson.did, legalEntityObject)
    if(legalEntity != null) {
      orgJson.legalEntity = legalEntity as LegalEntity
      orgJson.legalEntity.organization = orgid
      orgJson.legalEntity.save()
    }
  }

  // Process Organizational Unit
  let organizationalUnitObject = getObjectProperty(orgJsonObject, 'organizationalUnit')
  if(organizationalUnitObject) {
    orgJson.organizationalType = 'OrganizationalUnit'
    let organizationalUnit = toOrganizationalUnit(orgJson.did, organizationalUnitObject)
    if(organizationalUnit) {
      orgJson.organizationalUnit = organizationalUnit as OrganizationalUnit
      orgJson.organizationalUnit.organization = orgid
      orgJson.organizationalUnit.save()
    }
  }

  // Process Public Keys
  let publicKeyArray = getArrayProperty(orgJsonObject, 'publicKey')
  if(publicKeyArray) {
    orgJson.publicKey = []
    for(let i=0; i<publicKeyArray.length; i++) {
      let publicKeyValue = (publicKeyArray as Array<JSONValue>)[i]
      if(publicKeyValue.kind == JSONValueKind.OBJECT) {
        let publicKey = toPublicKey(orgJson.did, publicKeyValue.toObject())
        if(publicKey != null) {
          publicKey.save()
          orgJson.publicKey.push(publicKey as PublicKey)
        }
      }
    }
  }

  // Process Service list
  let serviceArray = getArrayProperty(orgJsonObject, 'service')
  if(serviceArray) {
    orgJson.service = []
    for(let i=0; i<serviceArray.length; i++) {
      let serviceValue = (serviceArray as Array<JSONValue>)[i]
      if(serviceValue.kind == JSONValueKind.OBJECT) {
        let service = toService(orgJson.did, serviceValue.toObject())
        if(service != null) {
          service.save()
          orgJson.service.push(service as Service)
        }
      }
    }
  }

  return orgJson

}