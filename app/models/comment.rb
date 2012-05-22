class Comment < ActiveRecord::Base
  attr_accessible :id, :body, :movie_id, :position, :updated_at, :created_at
end
