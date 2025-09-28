"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, MapPin, Clock, ArrowLeft, LogOut, User } from "lucide-react"
import Link from "next/link"

interface PendingSubmission {
  id: string
  name: string
  type: "shelter" | "food_bank" | "clinic"
  address: string
  notes: string
  submittedAt: Date
  status: "pending" | "approved" | "rejected"
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return // Still loading

    if (status === "unauthenticated") {
      router.push('/admin/signin')
      return
    }

    if (session && !session.user?.isAdmin) {
      router.push('/admin/error')
      return
    }
  }, [session, status, router])

  // Fetch pending resources on component mount
  useEffect(() => {
    const fetchPendingResources = async () => {
      try {
        const response = await fetch("/api/list-pending")
        if (response.ok) {
          const { resources } = await response.json()
          const formattedResources = resources.map((resource: any) => ({
            id: resource.id,
            name: resource.name,
            type: resource.type,
            address: resource.address,
            notes: resource.notes,
            submittedAt: new Date(resource.submittedAt),
            status: "pending" as const,
          }))
          setSubmissions(formattedResources)
        } else {
          console.error("Failed to fetch pending resources")
        }
      } catch (error) {
        console.error("Error fetching pending resources:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingResources()
  }, [])

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      if (response.ok) {
        // Remove the approved submission from the list
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id))
        alert("Resource approved successfully!")
      } else {
        throw new Error("Failed to approve resource")
      }
    } catch (error) {
      console.error("Error approving resource:", error)
      alert("Failed to approve resource. Please try again.")
    }
  }

  const handleReject = (id: string) => {
    // For now, just remove from the list (in a real app, you might want to mark as rejected in the database)
    setSubmissions((prev) => prev.filter((sub) => sub.id !== id))
    alert("Resource rejected.")
  }

  const getTypeColor = (type: PendingSubmission["type"]) => {
    switch (type) {
      case "shelter":
        return "bg-destructive text-destructive-foreground"
      case "food_bank":
        return "bg-primary text-primary-foreground"
      case "clinic":
        return "bg-accent text-accent-foreground"
      default:
        return "bg-secondary text-secondary-foreground"
    }
  }

  const getTypeLabel = (type: PendingSubmission["type"]) => {
    switch (type) {
      case "shelter":
        return "Shelter"
      case "food_bank":
        return "Food Bank"
      case "clinic":
        return "Clinic"
      default:
        return "Resource"
    }
  }

  const getStatusColor = (status: PendingSubmission["status"]) => {
    switch (status) {
      case "pending":
        return "bg-secondary text-secondary-foreground"
      case "approved":
        return "bg-primary text-primary-foreground"
      case "rejected":
        return "bg-destructive text-destructive-foreground"
    }
  }

  const pendingCount = submissions.filter((sub) => sub.status === "pending").length

  // Show loading while checking authentication
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">
            {status === "loading" ? "Checking authentication..." : "Loading pending resources..."}
          </p>
        </div>
      </div>
    )
  }

  // Don't render anything if redirecting
  if (!session?.user?.isAdmin) {
    return null
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </Button>
            </Link>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{session.user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Resource Admin</h1>
          <p className="text-muted-foreground">Manage emergency resource submissions</p>
          {pendingCount > 0 && (
            <Badge className="mt-2 bg-primary text-primary-foreground">
              {pendingCount} pending review{pendingCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Submissions List */}
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-card-foreground">{submission.name}</h3>
                    <Badge className={getTypeColor(submission.type)}>{getTypeLabel(submission.type)}</Badge>
                    <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{submission.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Submitted {submission.submittedAt.toLocaleDateString()}</span>
                    </div>
                    {submission.notes && <p className="mt-2 text-card-foreground">{submission.notes}</p>}
                  </div>
                </div>

                {/* Action Buttons */}
                {submission.status === "pending" && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleApprove(submission.id)} className="h-12 px-6" size="lg">
                      <Check className="w-5 h-5 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(submission.id)}
                      variant="destructive"
                      className="h-12 px-6"
                      size="lg"
                    >
                      <X className="w-5 h-5 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {submissions.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">No submissions yet</p>
          </Card>
        )}
      </div>
    </div>
  )
}
