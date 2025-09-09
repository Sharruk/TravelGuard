import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PanicButtonProps {
  touristId?: string;
}

export default function PanicButton({ touristId }: PanicButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const panicMutation = useMutation({
    mutationFn: async () => {
      if (!touristId) throw new Error("Tourist ID not found");
      return apiRequest("POST", `/api/tourist/panic/${touristId}`, {});
    },
    onSuccess: () => {
      setShowDialog(true);
      queryClient.invalidateQueries({ queryKey: ["/api/tourist/alerts"] });
      toast({
        title: "Emergency Alert Sent",
        description: "Your location and emergency signal have been sent to authorities",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send emergency alert. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePanicClick = () => {
    panicMutation.mutate();
  };

  return (
    <>
      <Button
        onClick={handlePanicClick}
        disabled={panicMutation.isPending}
        className="bg-destructive text-destructive-foreground px-6 py-3 font-bold pulse-red flex-1 max-w-48"
        data-testid="button-panic"
      >
        <AlertTriangle className="h-5 w-5 mr-2" />
        {panicMutation.isPending ? "SENDING..." : "PANIC"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="dialog-panic-confirmation">
          <DialogHeader>
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <DialogTitle>Emergency Alert Sent</DialogTitle>
              <DialogDescription className="mt-2">
                Your location and emergency signal have been sent to local authorities and your emergency contacts.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button onClick={() => setShowDialog(false)} data-testid="button-panic-ok">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
