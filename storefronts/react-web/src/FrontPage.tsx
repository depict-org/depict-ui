import React from "react";
import { Link } from "react-router-dom";

export function FrontPage() {
  return (
    <div className="container">
      <h1>Welcome to One-Stop-Shop</h1>
      <p>Where all your shopping dreams come true!</p>
      <p>We have everything you need and more!</p>
      <p>From toilet paper to yachts, we've got it all!</p>
      <p>Come on in and take a look around!</p>

      <p>
        <Link to={"/pdp"}>Go to PDP</Link>
      </p>
      <p>
        <Link to={{ pathname: "/category", search: "?id=48a0305d-9f6d-41fa-952e-b70c4fd4e066" }} className="test-category-page">
          Go to Women's
        </Link>
      </p>
    </div>
  );
}
