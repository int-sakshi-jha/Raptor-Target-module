import { Navigate, useParams } from "react-router-dom";

/** Default child of `/plants/:id` — land on the live dashboard. */
const PlantRootRedirect = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <Navigate to={`/plants/${id}/dashboard`} replace />;
};

export default PlantRootRedirect;
