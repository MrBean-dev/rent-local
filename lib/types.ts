export type Category = 'trailer' | 'backhoe' | 'tool' | 'box_truck'
export type Condition = 'excellent' | 'good' | 'fair'

export interface Listing {
  id: string
  title: string
  description: string
  category: Category
  condition: Condition
  pricePerDay: number
  location: string
  contactName: string
  contactPhone: string
  contactEmail: string
  createdAt: string
  imageUrl?: string
  available: boolean
  pickupAddress?: string
  lat?: number
  lng?: number
}

export interface UserProfile {
  id: string
  name: string
  phone: string
  email: string
  location: string
  bio: string
  createdAt: string
}

export type RequestStatus = 'pending' | 'approved' | 'declined'

export interface RentalRequest {
  id: string
  listingId: string
  listingTitle: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  renterId: string
  renterName: string
  renterPhone: string
  renterEmail: string
  startDate: string
  endDate: string
  message: string
  status: RequestStatus
  createdAt: string
  idDocumentUrl?: string
}

export interface InspectionPhoto {
  id: string
  dataUrl: string
  note: string
  capturedAt: string
}

export interface Review {
  id: string
  requestId: string
  listingId: string
  reviewerId: string
  revieweeId: string
  reviewerType: 'renter' | 'owner'
  reviewerName: string
  rating: number
  comment: string
  createdAt: string
}

export interface RentalInspection {
  id: string
  listingId: string
  listingTitle: string
  renterName: string
  createdAt: string
  photos: InspectionPhoto[]
}

export type ServiceCategory = 'backhoe_operator' | 'box_truck_driver' | 'trailer_hauler' | 'general_labor' | 'landscaping' | 'tree_service' | 'snow_removal' | 'pressure_washing' | 'painting' | 'moving' | 'hauling' | 'concrete'
export type RateType = 'hourly' | 'per_job'

export interface ServiceListing {
  id: string
  ownerId: string
  title: string
  description: string
  category: ServiceCategory
  rate: number
  rateType: RateType
  location: string
  contactName: string
  imageUrl?: string
  available: boolean
  insured: boolean
  yearsExperience?: number
  serviceRadius?: number
  lat?: number
  lng?: number
  createdAt: string
}

export interface ServiceReview {
  id: string
  requestId: string
  serviceId: string
  reviewerId: string
  reviewerName: string
  rating: number
  comment: string
  createdAt: string
}

export interface ServiceRequest {
  id: string
  serviceId: string
  serviceTitle: string
  providerName: string
  hirerId: string
  hirerName: string
  startDate: string
  endDate: string
  message: string
  status: RequestStatus
  createdAt: string
}
