import { Address, Bytes, log, BigInt} from "@graphprotocol/graph-ts"
import {
  ChallengeContributed,
  Dispute,
  Evidence,
  MetaEvidence,
  OrganizationAdded,
  OrganizationChallenged,
  OrganizationRemoved,
  OrganizationRequestRemoved,
  OrganizationSubmitted,
  Ruling,
  SegmentChanged,
  ArbitrableDirectoryContract,
} from '../../generated/templates/ArbitrableDirectoryTemplate/ArbitrableDirectoryContract'
import { Directory } from '../../generated/schema'

// Handle a change of name of the directory
export function handleDirectoryNameChanged(event: SegmentChanged): void {
  let directory = Directory.load(event.address.toHexString())
  if(directory) {
    directory.segment = event.params._newSegment
    directory.save()
  } else {
    log.error("handleDirectoryNameChanged|Directory Not found|{}", [event.address.toHexString()])
  }
}

// Helper to udpdate the organizations lists
function updateOrganizations(directoryAddress: Address, updateRegistered: boolean, updateRequested: boolean): void {
  let directory = Directory.load(directoryAddress.toHexString())
  if(directory) {
    let directoryContact = ArbitrableDirectoryContract.bind(directoryAddress)
    if(directoryContact) {
      let zero: i32 = 0

      // If Registered Organizations need to be updated
      if(updateRegistered) {
        log.info("updateOrganizations|Retrieving registered organizations from Contract|{}", [directoryAddress.toHexString()])
        let getOrganizationCallResult = directoryContact.try_getOrganizations(BigInt.fromI32(zero), BigInt.fromI32(zero))
        if(!getOrganizationCallResult.reverted) {
          let getOrganizationValue = getOrganizationCallResult.value as Array<Bytes>
          log.info("updateOrganizations|getOrganizations() found {}|{}", [getOrganizationValue.length.toString(), directoryAddress.toHexString()])
          directory.registeredOrganizations = getOrganizationValue.map<string>((value: Bytes) => value.toHexString())
        } else {
          log.error("updateOrganizations|getOrganizations() call reverted|{}", [directoryAddress.toHexString()])
        }
      }
  
      // If Requested Organizations need to be updated
      if(updateRequested) {
        log.info("updateOrganizations|Retrieving requested organizations from Contract|{}", [directoryAddress.toHexString()])
        let getRequestedOrganizationsCallResult = directoryContact.try_getRequestedOrganizations(BigInt.fromI32(zero), BigInt.fromI32(zero))
        if(!getRequestedOrganizationsCallResult.reverted) {
          let getRequestedOrganizationsValue = getRequestedOrganizationsCallResult.value as Array<Bytes>
          log.info("updateOrganizations|getRequestedOrganizations() found {}|{}", [getRequestedOrganizationsValue.length.toString(), directoryAddress.toHexString()])
          directory.pendingOrganizations = getRequestedOrganizationsValue.map<string>((value: Bytes) => value.toHexString())
        } else {
          log.error("updateOrganizations|getRequestedOrganizations() call reverted|{}", [directoryAddress.toHexString()])
        }
      }
      
      directory.save()
    } else {
      log.error("updateOrganizations|Contract Not found|{}", [directoryAddress.toHexString()])
    }
  } else {
    log.error("updateOrganizations|Directory Not found|{}", [directoryAddress.toHexString()])
  }
}

// Handle the inclusion of a new organization in the directory
export function handleOrganizationAdded(event: OrganizationAdded): void {
  updateOrganizations(event.address, true, true)
}

// Handle the removal of an organization from the directory
export function handleOrganizationRemoved(event: OrganizationRemoved): void {
  updateOrganizations(event.address, true, false)
}

// Handle the request of an organization to join the directory
export function handleOrganizationSubmitted(event: OrganizationSubmitted): void {
  updateOrganizations(event.address, false, true)
}

// Handle the withdrawl of the request of an organization to join the directory
export function handleOrganizationRequestRemoved(event: OrganizationRequestRemoved): void {
  updateOrganizations(event.address, false, true)
}

/* TODO: Handle challenges and arbitration process */
export function handleOrganizationChallenged(event: OrganizationChallenged): void {}

export function handleRuling(event: Ruling): void {}

export function handleChallengeContributed(event: ChallengeContributed): void {}

export function handleDispute(event: Dispute): void {}

export function handleEvidence(event: Evidence): void {}

export function handleMetaEvidence(event: MetaEvidence): void {}