export type Category = 'trailer' | 'backhoe' | 'tool'
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
  renterName: string
  renterPhone: string
  renterEmail: string
  startDate: string
  endDate: string
  message: string
  status: RequestStatus
  createdAt: string
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
