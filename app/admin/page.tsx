"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, X, MapPin, Clock, ArrowLeft } from "lucide-react"
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
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Loading pending resources...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Map
              </Button>
            </Link>
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
