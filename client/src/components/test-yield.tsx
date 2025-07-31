import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestYield() {
  return (
    <Card className="bg-gradient-to-r from-purple-500 to-blue-500">
      <CardHeader>
        <CardTitle className="text-white">🚀 YIELD FEATURES TEST</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-white font-bold text-lg">
          If you can see this, the yield components should be working!
        </div>
      </CardContent>
    </Card>
  );
}